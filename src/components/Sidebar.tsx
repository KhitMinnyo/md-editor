import { useState, useRef, useEffect, useCallback } from 'react';
import type { MdFile, FileTreeNode, RecentFile, SearchMatch } from '../utils/fileManager';
import { isTauri, isMarkdownFile, isBinaryFile } from '../utils/fileManager';

interface RowActions {
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
function RowMenu({
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
        title="ရွေးချယ်စရာများ"
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
            နာမည်ပြောင်းမည်
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
                ဒီထဲမှာ ဖိုင်အသစ်
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  actions.setOpenMenuPath(null);
                  actions.startCreateIn(path, 'folder');
                }}
              >
                ဒီထဲမှာ Folder အသစ်
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
            ဖျက်မည်
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inline create form (used at root and inside a folder) ──
function InlineCreateForm({
  mode,
  onSubmit,
  onCancel,
  depth = 0,
}: {
  mode: 'file' | 'folder';
  onSubmit: (name: string) => void;
  onCancel: () => void;
  depth?: number;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <div className="new-file-form" style={{ paddingLeft: `${12 + depth * 16}px` }}>
      <input
        ref={inputRef}
        className="new-file-input"
        type="text"
        placeholder={mode === 'folder' ? 'Folder name...' : 'File name...'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        onBlur={submit}
      />
    </div>
  );
}

// ─── File Node ───────────────────────────────────────────
function FileNode({
  node,
  depth,
  isActive,
  onSelect,
  actions,
}: {
  node: FileTreeNode;
  depth: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  actions: RowActions;
}) {
  if (!node.file) return null;

  const isMd = isMarkdownFile(node.name);
  const isBin = isBinaryFile(node.name);
  const isRenaming = actions.renamingPath === node.path;

  if (isRenaming) {
    return (
      <div className="new-file-form" style={{ paddingLeft: `${12 + depth * 16}px` }}>
        <input
          className="new-file-input"
          type="text"
          autoFocus
          value={actions.renameValue}
          onChange={(e) => actions.setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              actions.submitRename();
            } else if (e.key === 'Escape') {
              actions.cancelRename();
            }
          }}
          onBlur={actions.submitRename}
        />
      </div>
    );
  }

  return (
    <div
      className={`file-item${isActive ? ' active' : ''}`}
      style={{ paddingLeft: `${12 + depth * 16}px`, opacity: isBin ? 0.5 : 1 }}
      onClick={() => onSelect(node.file!.id)}
    >
      <span className="file-item-icon">
        {isMd ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ) : isBin ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        )}
      </span>
      <span className="file-item-name">{node.name}</span>
      <span className="file-item-actions">
        <RowMenu path={node.path} name={node.name} isDir={false} actions={actions} />
      </span>
    </div>
  );
}

// ─── Folder Node ─────────────────────────────────────────
function FolderNode({
  node,
  depth,
  activeFileId,
  expandedFolders,
  onToggleFolder,
  onSelect,
  actions,
}: {
  node: FileTreeNode;
  depth: number;
  activeFileId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelect: (id: string) => void;
  actions: RowActions;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isRenaming = actions.renamingPath === node.path;
  const isCreatingHere = actions.creatingIn?.parentPath === node.path;

  return (
    <div className="folder-node">
      {isRenaming ? (
        <div className="new-file-form" style={{ paddingLeft: `${12 + depth * 16}px` }}>
          <input
            className="new-file-input"
            type="text"
            autoFocus
            value={actions.renameValue}
            onChange={(e) => actions.setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                actions.submitRename();
              } else if (e.key === 'Escape') {
                actions.cancelRename();
              }
            }}
            onBlur={actions.submitRename}
          />
        </div>
      ) : (
        <div
          className="folder-node-header"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onToggleFolder(node.path)}
        >
          {/* Chevron */}
          <span className={`folder-chevron${isExpanded ? ' expanded' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
          {/* Folder icon */}
          <span className="folder-icon">
            {isExpanded ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </span>
          <span className="folder-name">{node.name}</span>
          <span className="file-item-actions">
            <RowMenu path={node.path} name={node.name} isDir={true} actions={actions} />
          </span>
        </div>
      )}
      {(isExpanded || isCreatingHere) && (
        <div className="folder-children">
          {isCreatingHere && actions.creatingIn && (
            <InlineCreateForm
              mode={actions.creatingIn.mode}
              depth={depth + 1}
              onSubmit={(name) => actions.submitCreateIn(name)}
              onCancel={() => actions.startCreateIn('', 'file')}
            />
          )}
          {isExpanded &&
            node.children?.map((child) =>
              child.isDir ? (
                <FolderNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  activeFileId={activeFileId}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  onSelect={onSelect}
                  actions={actions}
                />
              ) : (
                <FileNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  isActive={child.file?.id === activeFileId}
                  onSelect={onSelect}
                  actions={actions}
                />
              ),
            )}
        </div>
      )}
    </div>
  );
}

// ─── Tree View ───────────────────────────────────────────
function TreeView({
  nodes,
  activeFileId,
  onSelect,
  actions,
}: {
  nodes: FileTreeNode[];
  activeFileId: string | null;
  onSelect: (id: string) => void;
  actions: RowActions;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <>
      {nodes.map((node) =>
        node.isDir ? (
          <FolderNode
            key={node.path}
            node={node}
            depth={0}
            activeFileId={activeFileId}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onSelect={onSelect}
            actions={actions}
          />
        ) : (
          <FileNode
            key={node.path}
            node={node}
            depth={0}
            isActive={node.file?.id === activeFileId}
            onSelect={onSelect}
            actions={actions}
          />
        ),
      )}
    </>
  );
}

// ─── Recent Files ────────────────────────────────────────
function RecentFilesSection({
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
        <span className="folder-name">မကြာမီက ဖွင့်ခဲ့သည်</span>
      </div>
      {expanded && (
        <div className="folder-children">
          {recentFiles.map((f) => (
            <div key={f.id} className="file-item" style={{ paddingLeft: 36 }} onClick={() => onSelect(f.id)}>
              <span className="file-item-name">{f.name}</span>
              <button
                className="file-item-delete icon-btn"
                onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                title="စာရင်းမှဖယ်ရှားမည်"
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

// ─── Search Results ──────────────────────────────────────
function SearchResults({
  matches,
  loading,
  onSelect,
}: {
  matches: SearchMatch[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return <div className="empty-state"><span className="empty-state-text">ရှာနေသည်...</span></div>;
  }
  if (matches.length === 0) {
    return <div className="empty-state"><span className="empty-state-text">ရလဒ်မတွေ့ပါ</span></div>;
  }
  return (
    <>
      {matches.map((m, i) => (
        <div
          key={`${m.fileId}-${m.lineNumber}-${i}`}
          className="search-result-item"
          onClick={() => onSelect(m.fileId)}
        >
          <div className="search-result-file">{m.fileName}<span className="search-result-line">:{m.lineNumber}</span></div>
          <div className="search-result-snippet">{m.snippet}</div>
        </div>
      ))}
    </>
  );
}

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

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (!searchOpen) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchOpen]);

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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          MD Editor
        </div>
        <div className="sidebar-actions">
          {isTauri() && useTree && (
            <button
              className="icon-btn"
              onClick={() => setSearchOpen((v) => !v)}
              title="ဖိုင်များထဲ ရှာမည်"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}
          {isTauri() && (
            <button className="icon-btn" onClick={onOpenFolder} title="Folder ဖွင့်ပါ">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => setIsCreating(true)} title="ဖိုင်အသစ်">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button className="icon-btn" onClick={onOpenSettings} title="ဆက်တင်များ">
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
            placeholder="ဖိုင်များထဲ ရှာမည်..."
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

      {/* Folder breadcrumb */}
      {!searchOpen && folderDisplayName && (
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
      {!searchOpen && isCreating && (
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
                    ? 'Folder တစ်ခု ဖွင့်ပါ'
                    : 'ဖိုင်မရှိသေးပါ။ အသစ်တစ်ခု ဖန်တီးလိုက်ပါ။'}
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
                    title="ဖျက်မည်"
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

      {/* Root-level "new folder" quick action */}
      {!searchOpen && useTree && (
        <div className="sidebar-footer">
          <button
            className="icon-btn"
            title="Folder အသစ်"
            onClick={() => setCreatingIn({ parentPath: '__root__', mode: 'folder' })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            Folder အသစ်
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
