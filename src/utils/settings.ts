/**
 * User-configurable app settings, persisted to localStorage (applies in
 * both Tauri and browser-dev mode).
 */
export interface AppSettings {
  /** How long to wait after the last keystroke before auto-saving, in ms. */
  autoSaveDelayMs: number;
  /** Max width of the editor content column, in px. */
  editorMaxWidth: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSaveDelayMs: 600,
  editorMaxWidth: 800,
};

const SETTINGS_KEY = 'md-editor-settings';

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
