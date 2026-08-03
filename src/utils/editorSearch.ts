/**
 * Minimal in-document find/replace over a TipTap (ProseMirror) editor.
 *
 * Note: matches are found per text node, so a query that spans a mark
 * boundary (e.g. "hello" where only "hel" is bold) won't be found. Good
 * enough for typical find-in-document use; a full cross-node search would
 * need to build a position-mapped flattened string of the whole doc.
 */
import type { Editor } from '@tiptap/core';

export interface EditorMatch {
  from: number;
  to: number;
}

export function findMatches(editor: Editor, query: string, caseSensitive = false): EditorMatch[] {
  if (!query) return [];
  const matches: EditorMatch[] = [];
  const q = caseSensitive ? query : query.toLowerCase();

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = caseSensitive ? node.text : node.text.toLowerCase();
    let idx = text.indexOf(q);
    while (idx !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + q.length });
      idx = text.indexOf(q, idx + 1);
    }
  });

  return matches;
}

export function selectMatch(editor: Editor, match: EditorMatch): void {
  editor.chain().focus().setTextSelection(match).scrollIntoView().run();
}

/** Replace a single match, keeping the selection at the replaced text. */
export function replaceMatch(editor: Editor, match: EditorMatch, replacement: string): void {
  editor.chain().focus().insertContentAt(match, replacement).run();
}

/**
 * Replace every match. Matches must be processed from the last position
 * to the first — replacing text shifts every position *after* it, but
 * positions before an edit are unaffected, so working backwards means
 * each match's `from`/`to` is still valid when we get to it.
 */
export function replaceAllMatches(editor: Editor, matches: EditorMatch[], replacement: string): void {
  const chain = editor.chain().focus();
  const sorted = [...matches].sort((a, b) => b.from - a.from);
  for (const match of sorted) {
    chain.insertContentAt(match, replacement);
  }
  chain.run();
}
