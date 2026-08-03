import { useEffect, useState, useCallback } from 'react';
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

export default function Outline({ editor }: { editor: Editor | null }) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  const refresh = useCallback(() => {
    if (!editor) {
      setHeadings([]);
      return;
    }
    setHeadings(extractHeadings(editor));
  }, [editor]);

  useEffect(() => {
    refresh();
    if (!editor) return;
    editor.on('update', refresh);
    return () => {
      editor.off('update', refresh);
    };
  }, [editor, refresh]);

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
