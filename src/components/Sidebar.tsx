import { useState, useRef, useEffect, useCallback } from 'react';
import type { MdFile, FileTreeNode } from '../utils/fileManager';
import { isTauri, isMarkdownFile, isBinaryFile } from '../utils/fileManager';

interface SidebarProps {
  files: MdFile[];
  treeNodes: FileTreeNode[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string) => void;
  onDeleteFile: (id: string) => void;
  onOpenFolder: () => void;
  currentFolder: string | null;
}

// ─── File Node ───────────────────────────────────────────
function FileNode({
  node,
  depth,
  isActive,
  onSelect,
  onDelete,
}: {
  node: FileTreeNode;
  depth: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!node.file) return null;

  const isMd = isMarkdownFile(node.name);
  const isBin = isBinaryFile(node.name);

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
      <button
        className="file-item-delete icon-btn danger"
        onClick={(e) => { e.stopPropagation(); onDelete(node.file!.id); }}
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
  onDelete,
}: {
  node: FileTreeNode;
  depth: number;
  activeFileId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);

  return (
    <div className="folder-node">
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
      </div>
      {isExpanded && node.children && (
        <div className="folder-children">
          {node.children.map((child) =>
            child.isDir ? (
              <FolderNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ) : (
              <FileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                isActive={child.file?.id === activeFileId}
                onSelect={onSelect}
                onDelete={onDelete}
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
  onDelete,
}: {
  nodes: FileTreeNode[];
  activeFileId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
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
            onDelete={onDelete}
          />
        ) : (
          <FileNode
            key={node.path}
            node={node}
            depth={0}
            isActive={node.file?.id === activeFileId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ),
      )}
    </>
  );
}

// ─── Main Sidebar ────────────────────────────────────────
function Sidebar({
  files,
  treeNodes,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onOpenFolder,
  currentFolder,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

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
        </div>
      </div>

      {/* Folder breadcrumb */}
      {folderDisplayName && (
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

      {/* New file form */}
      {isCreating && (
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

      {/* File list / Tree view */}
      <div className="file-list">
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
          <TreeView
            nodes={treeNodes}
            activeFileId={activeFileId}
            onSelect={onSelectFile}
            onDelete={onDeleteFile}
          />
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
      </div>
    </div>
  );
}

export default Sidebar;
