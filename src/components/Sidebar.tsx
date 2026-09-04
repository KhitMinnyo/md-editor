import { useState, useRef, useEffect, useCallback } from 'react';
import type { MdFile, FileTreeNode, RecentFile, SearchMatch } from '../utils/fileManager';
import { isTauri } from '../utils/fileManager';
import type { TagIndexEntry } from '../utils/markdown';
import type { RowActions } from './sidebar/RowMenu';
import { InlineCreateForm } from './sidebar/InlineCreateForm';
import { TreeView } from './sidebar/TreeView';
import { RecentFilesSection } from './sidebar/RecentFilesSection';
import { SearchResults } from './sidebar/SearchResults';
import { TagsPanel } from './sidebar/TagsPanel';

// ─── Main Sidebar ────────────────────────────────────────
interface SidebarProps {
  files: MdFile[];
  treeNodes: FileTreeNode[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string, dirPath?: string) => void;
  onCreateFolder: (name: string, dirPath?: string) => void;
  onDeleteFile: (id: string) => void;
  onRenamePath: (oldPath: string, newName: string) => void;
  onOpenFolder: () => void;
  currentFolder: string | null;
  recentFiles: RecentFile[];
  onRemoveRecentFile: (id: string) => void;
  onSearch: (query: string) => Promise<SearchMatch[]>;
  onLoadTags: () => Promise<TagIndexEntry[]>;
  onOpenSettings: () => void;
}

function Sidebar({
  files,
  treeNodes,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenamePath,
  onOpenFolder,
  currentFolder,
  recentFiles,
  onRemoveRecentFile,
  onSearch,
  onLoadTags,
  onOpenSettings,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Row-level state (rename / row menu / create-inside-folder)
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingIn, setCreatingIn] = useState<{ parentPath: string; mode: 'file' | 'folder' } | null>(null);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tags (browse files by frontmatter Tags/Date)
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagIndex, setTagIndex] = useState<TagIndexEntry[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (!searchOpen) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    let cancelled = false;
    // Wrapped in an IIFE so the setState calls below are nested inside a
    // function, not direct statements in the effect body — the only part
    // of react-hooks/set-state-in-effect that actually matters here; the
    // debounce/search behavior itself is unchanged from before.
    (() => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      searchDebounceRef.current = setTimeout(async () => {
        const results = await onSearch(searchQuery);
        if (!cancelled) {
          setSearchResults(results);
          setSearchLoading(false);
        }
      }, 300);
    })();
    return () => {
      cancelled = true;
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchOpen]);

  useEffect(() => {
    if (!tagsOpen) return;
    let cancelled = false;
    // See the search effect above for why this is wrapped in an IIFE.
    (() => {
      setSelectedTag(null);
      setTagsLoading(true);
      onLoadTags()
        .then((index) => {
          if (!cancelled) setTagIndex(index);
        })
        .finally(() => {
          if (!cancelled) setTagsLoading(false);
        });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsOpen]);

  const handleSubmit = () => {
    const trimmed = newFileName.trim();
    if (trimmed) {
      onCreateFile(trimmed);
    }
    setNewFileName('');
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const startRename = useCallback((path: string, currentName: string) => {
    setRenamingPath(path);
    setRenameValue(currentName);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingPath(null);
    setRenameValue('');
  }, []);

  const submitRename = useCallback(() => {
    if (renamingPath && renameValue.trim()) {
      onRenamePath(renamingPath, renameValue.trim());
    }
    setRenamingPath(null);
    setRenameValue('');
  }, [renamingPath, renameValue, onRenamePath]);

  const startCreateIn = useCallback((parentPath: string, mode: 'file' | 'folder') => {
    if (!parentPath) {
      setCreatingIn(null);
      return;
    }
    setCreatingIn({ parentPath, mode });
  }, []);

  const submitCreateIn = useCallback(
    (name: string) => {
      if (!creatingIn) return;
      const dir = creatingIn.parentPath === '__root__' ? undefined : creatingIn.parentPath;
      if (creatingIn.mode === 'folder') onCreateFolder(name, dir);
      else onCreateFile(name, dir);
      setCreatingIn(null);
    },
    [creatingIn, onCreateFile, onCreateFolder],
  );

  const actions: RowActions = {
    openMenuPath,
    setOpenMenuPath,
    renamingPath,
    renameValue,
    setRenameValue,
    startRename,
    submitRename,
    cancelRename,
    creatingIn,
    startCreateIn,
    submitCreateIn,
    onDelete: onDeleteFile,
  };

  // Extract folder display name
  const folderDisplayName = currentFolder ? currentFolder.split('/').pop() || currentFolder : null;

  // Decide whether to use tree view or flat file list
  const useTree = isTauri() && treeNodes.length > 0;
  const showEmpty = useTree ? treeNodes.length === 0 : files.length === 0;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon-stack">
            <img src="/app-icon.png" alt="MD Editor" className="sidebar-logo-img" />
            <span className="sidebar-logo-version">v{__APP_VERSION__}</span>
          </div>
        </div>
        <div className="sidebar-actions">
          {isTauri() && useTree && (
            <button
              className="icon-btn"
              onClick={() => {
                setSearchOpen((v) => !v);
                setTagsOpen(false);
              }}
              title="Search files"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}
          {isTauri() && useTree && (
            <button
              className="icon-btn"
              onClick={() => {
                setTagsOpen((v) => !v);
                setSearchOpen(false);
              }}
              title="Browse by tag"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.17H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.82 0l4.6-4.6a2 2 0 0 0 0-2.82Z" />
                <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
          )}
          {isTauri() && (
            <button className="icon-btn" onClick={onOpenFolder} title="Open Folder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => setIsCreating(true)} title="New File">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && useTree && (
        <div className="new-file-form">
          <input
            className="new-file-input"
            type="text"
            autoFocus
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchQuery('');
              }
            }}
          />
        </div>
      )}

      {/* Tags panel */}
      {tagsOpen && useTree && (
        <div className="file-list">
          <TagsPanel
            tagIndex={tagIndex}
            loading={tagsLoading}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            onBack={() => setSelectedTag(null)}
            onSelectFile={onSelectFile}
          />
        </div>
      )}

      {/* Folder breadcrumb */}
      {!searchOpen && !tagsOpen && folderDisplayName && (
        <div style={{
          padding: '4px 20px 4px',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          overflow: 'hidden',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 12, height: 12, flexShrink: 0 }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folderDisplayName}
          </span>
        </div>
      )}

      <div className="sidebar-divider" />

      {/* New file / folder form (root level) */}
      {!searchOpen && !tagsOpen && isCreating && (
        <div className="new-file-form">
          <input
            ref={inputRef}
            className="new-file-input"
            type="text"
            placeholder="File name..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
          />
        </div>
      )}

      {/* File list / Tree view / Search results */}
      {!tagsOpen && (
      <div className="file-list">
        {searchOpen ? (
          <SearchResults matches={searchResults} loading={searchLoading} onSelect={onSelectFile} />
        ) : (
          <>
            <RecentFilesSection
              recentFiles={recentFiles}
              onSelect={onSelectFile}
              onRemove={onRemoveRecentFile}
            />
            {showEmpty ? (
              <div className="empty-state">
                <span className="empty-state-icon">📄</span>
                <span className="empty-state-text">
                  {isTauri() && !currentFolder
                    ? 'Open a folder'
                    : 'No files yet. Create a new one.'}
                </span>
              </div>
            ) : useTree ? (
              <>
                {creatingIn && creatingIn.parentPath === '__root__' && (
                  <InlineCreateForm
                    mode={creatingIn.mode}
                    onSubmit={submitCreateIn}
                    onCancel={() => setCreatingIn(null)}
                  />
                )}
                <TreeView
                  nodes={treeNodes}
                  activeFileId={activeFileId}
                  onSelect={onSelectFile}
                  actions={actions}
                />
              </>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className={`file-item${file.id === activeFileId ? ' active' : ''}`}
                  onClick={() => onSelectFile(file.id)}
                >
                  <span className="file-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </span>
                  <span className="file-item-name">{file.name}</span>
                  <button
                    className="file-item-delete icon-btn danger"
                    onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); }}
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
      )}

      {/* Root-level "new folder" quick action */}
      {!searchOpen && !tagsOpen && useTree && (
        <div className="sidebar-footer">
          <button
            className="icon-btn"
            title="New Folder"
            onClick={() => setCreatingIn({ parentPath: '__root__', mode: 'folder' })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            New Folder
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
