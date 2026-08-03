import { useState, useEffect } from 'react';
import type { AppSettings } from '../utils/settings';

interface SettingsDialogProps {
  isOpen: boolean;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsDialog({
  isOpen,
  settings,
  onSave,
  onClose,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  useEffect(() => {
    if (isOpen) setDraft(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <span className="dialog-title">⚙️ Settings</span>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>

        <div className="dialog-field">
          <label className="dialog-label">Auto-save delay (ms)</label>
          <input
            className="dialog-input"
            type="number"
            min={200}
            max={5000}
            step={100}
            value={draft.autoSaveDelayMs}
            onChange={(e) =>
              setDraft((d) => ({ ...d, autoSaveDelayMs: Number(e.target.value) || d.autoSaveDelayMs }))
            }
          />
        </div>

        <div className="dialog-field">
          <label className="dialog-label">Editor content width (px)</label>
          <input
            className="dialog-input"
            type="number"
            min={480}
            max={1400}
            step={20}
            value={draft.editorMaxWidth}
            onChange={(e) =>
              setDraft((d) => ({ ...d, editorMaxWidth: Number(e.target.value) || d.editorMaxWidth }))
            }
          />
        </div>

        <div className="dialog-field">
          <label className="dialog-label">Version</label>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            v{__APP_VERSION__}
          </span>
        </div>

        <div className="dialog-actions">
          <button type="button" className="dialog-btn dialog-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dialog-btn dialog-btn-submit" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
