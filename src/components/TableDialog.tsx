import { useState, useEffect, useRef } from 'react';

interface TableDialogProps {
  isOpen: boolean;
  onSubmit: (rows: number, cols: number) => void;
  onClose: () => void;
}

export default function TableDialog({ isOpen, onSubmit, onClose }: TableDialogProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const rowsRef = useRef<HTMLInputElement>(null);

  // Reset the form fields the moment the dialog transitions to open,
  // computed during render (React's documented pattern for resetting
  // state on a prop change) rather than via an effect.
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setRows(3);
      setCols(3);
    }
  }

  // Focus is a real side effect (the DOM), so it stays in an effect,
  // separate from the state reset above.
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => rowsRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (rows < 1 || cols < 1) return;
    onSubmit(Math.min(rows, 20), Math.min(cols, 20));
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <span className="dialog-title">📊 Insert Table</span>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '12px', padding: '12px 20px' }}>
          <div className="dialog-field" style={{ flex: 1, padding: 0 }}>
            <label className="dialog-label">Rows</label>
            <input
              ref={rowsRef}
              className="dialog-input"
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
                if (e.key === 'Escape') onClose();
              }}
              autoFocus
            />
          </div>
          <div className="dialog-field" style={{ flex: 1, padding: 0 }}>
            <label className="dialog-label">Columns</label>
            <input
              className="dialog-input"
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn dialog-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dialog-btn dialog-btn-submit" onClick={handleSubmit}>
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
