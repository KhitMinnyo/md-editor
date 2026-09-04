// Group 6.5 — Find & Outline
export default function FindOutlineGroup({
  onToggleFind,
  outlineOpen,
  onToggleOutline,
}: {
  onToggleFind: () => void;
  outlineOpen: boolean;
  onToggleOutline: () => void;
}) {
  return (
    <div className="toolbar-group">
      <button
        className="toolbar-btn"
        onClick={onToggleFind}
        data-tooltip="Find (Ctrl+F)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${outlineOpen ? 'active' : ''}`}
        onClick={onToggleOutline}
        data-tooltip="Outline"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
    </div>
  );
}
