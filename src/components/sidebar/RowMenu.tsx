import { useRef, useEffect } from 'react';

export interface RowActions {
  openMenuPath: string | null;
  setOpenMenuPath: (path: string | null) => void;
  renamingPath: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  startRename: (path: string, currentName: string) => void;
  submitRename: () => void;
  cancelRename: () => void;
  creatingIn: { parentPath: string; mode: 'file' | 'folder' } | null;
  startCreateIn: (parentPath: string, mode: 'file' | 'folder') => void;
  submitCreateIn: (name: string) => void;
  onDelete: (id: string) => void;
}

// ─── Row Menu (rename / new file / new folder / delete) ──
export function RowMenu({
  path,
  name,
  isDir,
  actions,
}: {
  path: string;
  name: string;
  isDir: boolean;
  actions: RowActions;
}) {
  const isOpen = actions.openMenuPath === path;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        actions.setOpenMenuPath(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, actions]);

  return (
    <div className="export-dropdown" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        className="icon-btn file-item-menu-btn"
        onClick={() => actions.setOpenMenuPath(isOpen ? null : path)}
        title="Options"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {isOpen && (
        <div className="export-menu">
          <button
            className="export-menu-item"
            onClick={() => {
              actions.setOpenMenuPath(null);
              actions.startRename(path, name);
            }}
          >
            Rename
          </button>
          {isDir && (
            <>
              <button
                className="export-menu-item"
                onClick={() => {
                  actions.setOpenMenuPath(null);
                  actions.startCreateIn(path, 'file');
                }}
              >
                New File Here
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  actions.setOpenMenuPath(null);
                  actions.startCreateIn(path, 'folder');
                }}
              >
                New Folder Here
              </button>
            </>
          )}
          <button
            className="export-menu-item danger"
            onClick={() => {
              actions.setOpenMenuPath(null);
              actions.onDelete(path);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
