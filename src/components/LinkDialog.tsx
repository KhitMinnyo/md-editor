import { useState, useEffect, useRef } from 'react';

interface LinkDialogProps {
  isOpen: boolean;
  initialText?: string;
  onSubmit: (url: string, text: string) => void;
  onClose: () => void;
}

export default function LinkDialog({ isOpen, initialText, onSubmit, onClose }: LinkDialogProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const urlRef = useRef<HTMLInputElement>(null);

  // Reset the form fields the moment the dialog transitions to open,
  // computed during render (React's documented pattern for resetting
  // state on a prop change) rather than via an effect. `initialText` is
  // only ever set at the same moment `isOpen` flips true (see Toolbar's
  // handleLink), so keying off `isOpen` alone is equivalent to the
  // original [isOpen, initialText] effect deps.
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setUrl('');
      setText(initialText || '');
    }
  }

  // Focus is a real side effect (the DOM), so it stays in an effect,
  // separate from the state reset above.
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => urlRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    onSubmit(trimmedUrl, text.trim());
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <span className="dialog-title">🔗 Insert Link</span>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>
        <div className="dialog-field">
          <label className="dialog-label">URL</label>
          <input
            ref={urlRef}
            className="dialog-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="https://example.com"
            autoFocus
          />
        </div>
        <div className="dialog-field">
          <label className="dialog-label">Display Text</label>
          <input
            className="dialog-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Link text"
          />
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="dialog-btn dialog-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog-btn dialog-btn-submit"
            disabled={!url.trim()}
            onClick={handleSubmit}
          >
            Add Link
          </button>
        </div>
      </div>
    </div>
  );
}
