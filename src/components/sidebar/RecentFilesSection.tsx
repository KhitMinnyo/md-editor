import { useState } from 'react';
import type { RecentFile } from '../../utils/fileManager';

// ─── Recent Files ────────────────────────────────────────
export function RecentFilesSection({
  recentFiles,
  onSelect,
  onRemove,
}: {
  recentFiles: RecentFile[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (recentFiles.length === 0) return null;

  return (
    <div className="recent-files-section">
      <div className="folder-node-header" style={{ paddingLeft: 12 }} onClick={() => setExpanded((v) => !v)}>
        <span className={`folder-chevron${expanded ? ' expanded' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ opacity: 0.6 }}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 16 14" />
        </svg>
        <span className="folder-name">Recent Files</span>
      </div>
      {expanded && (
        <div className="folder-children">
          {recentFiles.map((f) => (
            <div key={f.id} className="file-item" style={{ paddingLeft: 36 }} onClick={() => onSelect(f.id)}>
              <span className="file-item-name">{f.name}</span>
              <button
                className="file-item-delete icon-btn"
                onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                title="Remove from list"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="sidebar-divider" />
    </div>
  );
}
