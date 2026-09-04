import { useSyncExternalStore, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/core';

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

function extractHeadings(editor: Editor): HeadingItem[] {
  const items: HeadingItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      items.push({
        level: node.attrs.level as number,
        text: node.textContent || '(no title)',
        pos,
      });
    }
  });
  return items;
}

const EMPTY_HEADINGS: HeadingItem[] = [];

export default function Outline({ editor }: { editor: Editor | null }) {
  // Headings mirror an external system (the TipTap/ProseMirror document),
  // so this uses useSyncExternalStore — React's dedicated hook for that —
  // instead of an effect that subscribes and setState()s the current
  // value into local state. `cacheRef` remembers the last doc object a
  // heading list was computed for, so getSnapshot can return the exact
  // same array reference when nothing changed (required: a fresh array
  // every call would make useSyncExternalStore re-render in a loop).
  const cacheRef = useRef<{ doc: unknown; headings: HeadingItem[] } | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!editor) return () => {};
      editor.on('update', onStoreChange);
      return () => {
        editor.off('update', onStoreChange);
      };
    },
    [editor],
  );

  const getSnapshot = useCallback((): HeadingItem[] => {
    if (!editor) return EMPTY_HEADINGS;
    const doc = editor.state.doc;
    if (cacheRef.current && cacheRef.current.doc === doc) {
      return cacheRef.current.headings;
    }
    const headings = extractHeadings(editor);
    cacheRef.current = { doc, headings };
    return headings;
  }, [editor]);

  const headings = useSyncExternalStore(subscribe, getSnapshot);

  const goTo = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
  };

  return (
    <div className="outline-panel">
      <div className="outline-title">Outline</div>
      {headings.length === 0 ? (
        <div className="outline-empty">No headings yet</div>
      ) : (
        headings.map((h, i) => (
          <button
            key={i}
            className="outline-item"
            style={{ paddingLeft: 8 + (h.level - 1) * 12 }}
            onClick={() => goTo(h.pos)}
          >
            {h.text}
          </button>
        ))
      )}
    </div>
  );
}
