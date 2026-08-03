import { Editor } from '@tiptap/core';

interface TableToolbarProps {
  editor: Editor;
}

export default function TableToolbar({ editor }: TableToolbarProps) {
  try {
    if (!editor || !editor.isActive('table')) return null;
  } catch {
    return null;
  }

  return (
    <div className="table-toolbar">
      <div className="table-toolbar-group">
        <span className="table-toolbar-label">Row</span>
        <button
          className="table-toolbar-btn"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Add row above"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          ↑
        </button>
        <button
          className="table-toolbar-btn"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Add row below"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          ↓
        </button>
        <button
          className="table-toolbar-btn danger"
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Delete row"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="table-toolbar-divider" />

      <div className="table-toolbar-group">
        <span className="table-toolbar-label">Column</span>
        <button
          className="table-toolbar-btn"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="Add column left"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          ←
        </button>
        <button
          className="table-toolbar-btn"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Add column right"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          →
        </button>
        <button
          className="table-toolbar-btn danger"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Delete column"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="table-toolbar-divider" />

      <button
        className="table-toolbar-btn danger"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete table"
        style={{ gap: '4px' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Table
      </button>
    </div>
  );
}
