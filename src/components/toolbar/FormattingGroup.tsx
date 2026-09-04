import type { Editor } from '@tiptap/core';

// Group 2 — Text Formatting
export default function FormattingGroup({ editor }: { editor: Editor }) {
  return (
    <div className="toolbar-group">
      <button
        className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-tooltip="Bold (Ctrl+B)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-tooltip="Italic (Ctrl+I)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        data-tooltip="Underline (Ctrl+U)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
          <line x1="4" y1="21" x2="20" y2="21" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        data-tooltip="Strikethrough"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4c-.5-1.5-2.5-3-5-3-3 0-5 2-5 4 0 1.5.5 2.5 2 3.5" />
          <path d="M12 21c3 0 5-2 5-4 0-1.5-.5-2.5-2-3.5" />
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        data-tooltip="Highlight"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
          <line x1="18" y1="22" x2="4" y2="22" />
        </svg>
      </button>
    </div>
  );
}
