import type { Editor } from '@tiptap/core';

// Group 3 — Lists
export default function ListGroup({ editor }: { editor: Editor }) {
  return (
    <div className="toolbar-group">
      <button
        className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        data-tooltip="Bullet List"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="9" y1="6" x2="20" y2="6" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="5" cy="6" r="1" fill="currentColor" />
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="5" cy="18" r="1" fill="currentColor" />
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-tooltip="Ordered List"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="20" y2="6" />
          <line x1="10" y1="12" x2="20" y2="12" />
          <line x1="10" y1="18" x2="20" y2="18" />
          <text x="4" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
          <text x="4" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
          <text x="4" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
        </svg>
      </button>

      <button
        className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        data-tooltip="Task List"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <path d="M5 6.5l1.5 1.5L9 5" />
          <line x1="13" y1="6" x2="21" y2="6" />
          <rect x="3" y="15" width="6" height="6" rx="1" />
          <line x1="13" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}
