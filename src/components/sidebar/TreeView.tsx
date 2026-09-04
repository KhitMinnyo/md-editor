import { useState, useCallback } from 'react';
import type { FileTreeNode } from '../../utils/fileManager';
import { isMarkdownFile, isBinaryFile } from '../../utils/fileManager';
import { RowMenu, type RowActions } from './RowMenu';
import { InlineCreateForm } from './InlineCreateForm';

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
export function TreeView({
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
