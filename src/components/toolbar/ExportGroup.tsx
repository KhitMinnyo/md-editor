import { useState, useRef, useEffect } from 'react';

// Group 7 — Export (right side). Owns its own open/closed dropdown
// state and click-outside handling — nothing else in Toolbar needs either.
export default function ExportGroup({
  onImportFile,
  onExportMarkdown,
  onExportHtml,
}: {
  onImportFile: () => void;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="toolbar-group" style={{ marginLeft: 'auto' }}>
      <button
        className="toolbar-btn"
        onClick={onImportFile}
        data-tooltip="Import File"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      <div className="export-dropdown" ref={exportRef}>
        <button
          className="toolbar-btn"
          onClick={() => setExportOpen((prev) => !prev)}
          data-tooltip="Export"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
        {exportOpen && (
          <div className="export-menu">
            <button
              className="export-menu-item"
              onClick={() => {
                onExportMarkdown();
                setExportOpen(false);
              }}
            >
              Markdown (.md)
            </button>
            <button
              className="export-menu-item"
              onClick={() => {
                onExportHtml();
                setExportOpen(false);
              }}
            >
              HTML (.html)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
