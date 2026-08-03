use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// Holds file paths that were opened via "Open With" / file association.
struct OpenedFiles(Mutex<Vec<String>>);

/// Tauri command: frontend calls this on startup to get any files opened via "Open With".
#[tauri::command]
fn get_opened_files(state: tauri::State<OpenedFiles>) -> Vec<String> {
  let files = state.0.lock().unwrap();
  files.clone()
}

/// Tauri command: frontend calls this after successfully opening a file.
#[tauri::command]
fn clear_opened_files(state: tauri::State<OpenedFiles>) {
  let mut files = state.0.lock().unwrap();
  files.clear();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Check CLI args (some macOS versions might pass file path as arg)
  let cli_args: Vec<String> = std::env::args().collect();

  // Extract any file paths from CLI args (skip the binary path at index 0)
  let initial_files: Vec<String> = cli_args
    .iter()
    .skip(1)
    .filter(|arg| {
      !arg.starts_with('-') && (
        arg.ends_with(".md") ||
        arg.ends_with(".markdown") ||
        arg.ends_with(".txt") ||
        std::path::Path::new(arg).exists()
      )
    })
    .cloned()
    .collect();

  let app = tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .manage(OpenedFiles(Mutex::new(initial_files)))
    .invoke_handler(tauri::generate_handler![get_opened_files, clear_opened_files])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|app_handle, event| {
    match &event {
      #[cfg(target_os = "macos")]
      tauri::RunEvent::Opened { urls } => {
        let file_paths: Vec<String> = urls
          .iter()
          .filter_map(|url| {
            if url.scheme() == "file" {
              url.to_file_path().ok().map(|p| p.to_string_lossy().to_string())
            } else {
              Some(url.to_string())
            }
          })
          .collect();

        if file_paths.is_empty() {
          return;
        }

        // Store in state for polling
        if let Some(state) = app_handle.try_state::<OpenedFiles>() {
          let mut files = state.0.lock().unwrap();
          files.extend(file_paths.clone());
        }

        // Emit event to frontend
        let _ = app_handle.emit("file-open", &file_paths);
      }
      _ => {
        let _ = &app_handle; // suppress unused warning on non-macOS
      }
    }
  });
}
