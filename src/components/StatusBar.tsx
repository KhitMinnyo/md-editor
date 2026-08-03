import { Editor } from '@tiptap/core';

interface StatusBarProps {
  editor: Editor | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
}

const statusConfig = {
  saved: { label: 'Saved', color: 'var(--color-success)' },
  saving: { label: 'Saving...', color: 'var(--color-warning)' },
  unsaved: { label: 'Unsaved', color: 'var(--color-text-tertiary)' },
} as const;

export default function StatusBar({ editor, theme, onToggleTheme, saveStatus }: StatusBarProps) {
  const text = editor?.getText() ?? '';
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  const { label, color } = statusConfig[saveStatus];

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <div className="status-indicator">
          <span className="status-dot" style={{ background: color }} />
          <span>{label}</span>
        </div>
        <span>{wordCount} words</span>
        <span>{charCount} chars</span>
      </div>

      <div className="status-bar-right">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? (
            /* Sun icon — shown in dark mode, clicking switches to light */
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx={12} cy={12} r={5} />
              <line x1={12} y1={1} x2={12} y2={3} />
              <line x1={12} y1={21} x2={12} y2={23} />
              <line x1={4.22} y1={4.22} x2={5.64} y2={5.64} />
              <line x1={18.36} y1={18.36} x2={19.78} y2={19.78} />
              <line x1={1} y1={12} x2={3} y2={12} />
              <line x1={21} y1={12} x2={23} y2={12} />
              <line x1={4.22} y1={19.78} x2={5.64} y2={18.36} />
              <line x1={18.36} y1={5.64} x2={19.78} y2={4.22} />
            </svg>
          ) : (
            /* Moon icon — shown in light mode, clicking switches to dark */
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
