import type { Editor } from '@tiptap/core';

// Group 5 — Insert (code block, blockquote, hr, link, image, table)
export default function InsertGroup({
  editor,
  onLinkClick,
  onImageClick,
  onTableClick,
}: {
  editor: Editor;
  onLinkClick: () => void;
  onImageClick: () => void;
  onTableClick: () => void;
}) {
  return (
    <div className="toolbar-group">
      <button
        className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        data-tooltip="Code Block"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        data-tooltip="Blockquote"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.017-2-2H5c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2z" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.017-2-2h-3c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2z" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        data-tooltip="Horizontal Rule"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
        onClick={onLinkClick}
        data-tooltip="Link"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        onClick={onImageClick}
        data-tooltip="Image"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>

      <button
        className="toolbar-btn"
        onClick={onTableClick}
        data-tooltip="Table"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>
    </div>
  );
}
