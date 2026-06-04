<p align="center">
  <img src="src-tauri/icons/icon.png" alt="MD Editor" width="128" height="128">
</p>

<h1 align="center">MD Editor</h1>

<p align="center">
  <strong>A beautiful, fast, and lightweight Markdown editor for macOS, Windows, and Linux</strong>
</p>



---

## ✨ Features

- 📝 **Rich Markdown Editing** — WYSIWYG editor with live formatting (bold, italic, headings, lists, code blocks, tables, and more)
- 🌲 **Nested Folder Tree** — Browse and manage deeply nested directories with collapsible tree view
- 📂 **All File Types** — View `.md`, `.txt`, `.html`, `.css`, `.js`, `.py`, and other text files; binary files show a friendly unsupported message
- 🎨 **Dark & Light Themes** — Toggle between elegant dark and light modes
- ⌨️ **Keyboard Shortcuts** — `Cmd/Ctrl+S` save, `Cmd/Ctrl+N` new file, `Cmd/Ctrl+Shift+O` open folder
- 💾 **Auto-save** — Changes are automatically saved as you type
- 📤 **Export** — Export as `.md` or `.html`
- 🍎 **Universal macOS Binary** — Runs natively on both Apple Silicon (M1/M2/M3) and Intel Macs
- 🪟 **Windows Support** — Available as `.exe` installer for `x64` and `ARM64`
- 🐧 **Linux Support** — Available as `.deb` packages for `amd64` and `arm64` (Kali, Ubuntu, Debian)
- ⚡ **Blazing Fast** — Built with Tauri v2 + Rust backend, app launches in under 1 second
- 🔒 **Privacy First** — All files stay on your machine. No cloud, no telemetry, no tracking

---

## 📦 Installation

### macOS

1. Download the latest `.dmg` from [Releases](https://github.com/KhitMinnyo/md-editor/releases/latest)
2. Open the `.dmg` file
3. Drag **MD Editor** to your **Applications** folder
4. Launch from Applications

> **Note:** If macOS shows "App is damaged", run:
> ```bash
> xattr -cr /Applications/MD\ Editor.app
> ```

### Windows

1. Download the `.exe` installer for your architecture from [Releases](https://github.com/KhitMinnyo/md-editor/releases/latest):
   - `MD Editor_x.x.x_x64-setup.exe` — Intel/AMD 64-bit
   - `MD Editor_x.x.x_arm64-setup.exe` — ARM 64-bit (Snapdragon, etc.)

2. Run the installer and follow the prompts
3. Launch **MD Editor** from the Start Menu

### Linux (Kali / Ubuntu / Debian)

1. Download the `.deb` for your architecture from [Releases](https://github.com/KhitMinnyo/md-editor/releases/latest):
   - `md-editor_x.x.x_amd64.deb` — Intel/AMD 64-bit
   - `md-editor_x.x.x_arm64.deb` — ARM 64-bit (Raspberry Pi, etc.)

2. Install:
   ```bash
   sudo dpkg -i md-editor_*.deb
   sudo apt-get install -f  # Install any missing dependencies
   ```

3. Launch:
   ```bash
   md-editor
   ```

---

## ☁️ Cloud Sync (Optional)

MD Editor works with **any cloud storage** — just point it to your synced folder:

| Service | How to Sync |
|---|---|
| **iCloud Drive** | Open folder at `~/Library/Mobile Documents/com~apple~CloudDocs/Notes` |
| **Google Drive** | Install [Google Drive Desktop](https://www.google.com/drive/download/), open folder at `~/Google Drive/My Drive/Notes` |
| **Dropbox** | Open folder at `~/Dropbox/Notes` |
| **OneDrive** | Open folder at `~/OneDrive/Notes` |

Your notes will automatically sync across all your devices. No additional setup needed.

---

## 🛠️ Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (latest stable)
- **macOS:** Xcode Command Line Tools (`xcode-select --install`)
- **Linux:** System dependencies:
  ```bash
  sudo apt-get install -y \
    libwebkit2gtk-4.1-dev libgtk-3-dev \
    libayatana-appindicator3-dev librsvg2-dev \
    patchelf build-essential
  ```

### Build

```bash
# Clone the repo
git clone https://github.com/KhitMinnyo/md-editor.git
cd md-editor

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Build Targets

```bash
# macOS Universal (Intel + Apple Silicon)
npx tauri build --target universal-apple-darwin

# Windows x64
npx tauri build --bundles nsis --target x86_64-pc-windows-msvc

# Windows ARM64 (cross-compile from x64)
npx tauri build --bundles nsis --target aarch64-pc-windows-msvc

# Linux (on native machine)
npx tauri build --bundles deb
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + N` | New file |
| `Cmd/Ctrl + Shift + O` | Open folder |
| `Cmd/Ctrl + B` | Bold |
| `Cmd/Ctrl + I` | Italic |
| `Cmd/Ctrl + U` | Underline |
| `Cmd/Ctrl + Shift + X` | Strikethrough |
| `Cmd/Ctrl + E` | Code |
| `Cmd/Ctrl + Shift + H` | Highlight |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Tauri v2](https://v2.tauri.app/) |
| **Backend** | Rust |
| **Frontend** | React + TypeScript |
| **Editor** | [TipTap](https://tiptap.dev/) |
| **Bundler** | Vite |
| **Styling** | Vanilla CSS |
| **CI/CD** | GitHub Actions |

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/KhitMinnyo">Khit Minnyo</a>
</p>
