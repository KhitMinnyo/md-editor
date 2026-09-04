import type { Editor } from '@tiptap/core';

// Group 4 — Alignment
export default function AlignmentGroup({ editor }: { editor: Editor }) {
  return (
    <div className="toolbar-group">
      <button
        className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        data-tooltip="Align Left"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        data-tooltip="Align Center"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        data-tooltip="Align Right"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="9" y1="12" x2="21" y2="12" />
          <line x1="6" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}
