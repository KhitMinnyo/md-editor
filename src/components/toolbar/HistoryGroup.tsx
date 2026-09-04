import type { Editor } from '@tiptap/core';

// Group 6 — History
export default function HistoryGroup({ editor }: { editor: Editor }) {
  return (
    <div className="toolbar-group">
      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().undo().run()}
        data-tooltip="Undo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().redo().run()}
        data-tooltip="Redo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
        </svg>
      </button>
    </div>
  );
}
