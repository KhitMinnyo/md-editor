import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { findMatches, selectMatch, replaceMatch, replaceAllMatches, type EditorMatch } from '../utils/editorSearch';

interface FindReplaceBarProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FindReplaceBar({ editor, isOpen, onClose }: FindReplaceBarProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<EditorMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const queryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) queryInputRef.current?.focus();
  }, [isOpen]);

  const recompute = useCallback(() => {
    if (!editor || !query) {
      setMatches([]);
      return;
    }
    const found = findMatches(editor, query, false);
    setMatches(found);
    setActiveIndex((prev) => (found.length > 0 ? Math.min(prev, found.length - 1) : 0));
  }, [editor, query]);

  useEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, editor]);

  useEffect(() => {
    if (matches.length > 0 && editor) {
      selectMatch(editor, matches[activeIndex]);
    }
  }, [activeIndex, matches, editor]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % matches.length);
  }, [matches]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches]);

  const handleReplace = useCallback(() => {
    if (!editor || matches.length === 0) return;
    replaceMatch(editor, matches[activeIndex], replacement);
    // Recompute after the DOM/doc settles from the replace transaction.
    setTimeout(recompute, 0);
  }, [editor, matches, activeIndex, replacement, recompute]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || matches.length === 0) return;
    replaceAllMatches(editor, matches, replacement);
    setTimeout(recompute, 0);
  }, [editor, matches, replacement, recompute]);

  if (!isOpen) return null;

  return (
    <div className="find-replace-bar">
      <div className="find-replace-row">
        <button
          className="icon-btn"
          onClick={() => setShowReplace((v) => !v)}
          title="Toggle replace"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14"
            style={{ transform: showReplace ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <input
          ref={queryInputRef}
          className="find-input"
          type="text"
          placeholder="Find..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) goPrev();
              else goNext();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
        />
        <span className="find-count">
          {matches.length > 0 ? `${activeIndex + 1} / ${matches.length}` : query ? '0' : ''}
        </span>
        <button className="icon-btn" onClick={goPrev} title="Previous (Shift+Enter)" disabled={matches.length === 0}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button className="icon-btn" onClick={goNext} title="Next (Enter)" disabled={matches.length === 0}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button className="icon-btn" onClick={onClose} title="Close (Esc)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {showReplace && (
        <div className="find-replace-row">
          <span style={{ width: 22, flexShrink: 0 }} />
          <input
            className="find-input"
            type="text"
            placeholder="Replace..."
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleReplace();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
          <button className="dialog-btn dialog-btn-cancel find-replace-btn" onClick={handleReplace} disabled={matches.length === 0}>
            Replace
          </button>
          <button className="dialog-btn dialog-btn-submit find-replace-btn" onClick={handleReplaceAll} disabled={matches.length === 0}>
            Replace All
          </button>
        </div>
      )}
    </div>
  );
}
