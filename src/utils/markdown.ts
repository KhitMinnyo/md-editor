/**
 * Markdown ↔ HTML conversion utilities and file export helpers.
 * Uses Tauri native dialogs when available, falls back to browser APIs.
 */
import TurndownService from 'turndown';
import { marked } from 'marked';
import { convertFileSrc } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { isTauri, isMarkdownFile, saveFileDialog, type FileTreeNode } from './fileManager';

// Configure Turndown (HTML → Markdown)
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Keep table HTML tags so they survive the round-trip (TipTap tables → Markdown → TipTap).
// Turndown strips unknown tags by default; these rules preserve them as raw HTML in the markdown.
turndown.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement: function (content, node) {
    const tag = node.nodeName.toLowerCase();
    const trimmed = content.trim().replace(/\n/g, ' ');
    return `<${tag}>${trimmed}</${tag}>`;
  },
});

turndown.addRule('tableRow', {
  filter: 'tr',
  replacement: function (content) {
    return `<tr>${content}</tr>\n`;
  },
});

turndown.addRule('tableHead', {
  filter: 'thead',
  replacement: function (content) {
    return `<thead>${content}</thead>\n`;
  },
});

turndown.addRule('tableBody', {
  filter: 'tbody',
  replacement: function (content) {
    return `<tbody>${content}</tbody>\n`;
  },
});

turndown.addRule('table', {
  filter: 'table',
  replacement: function (content) {
    return `\n<table>${content}</table>\n\n`;
  },
});

// Images saved to disk (see Editor.tsx's onImageFile / data-relative-src)
// carry the portable relative path separately from the asset:// URL used
// to actually display them — write the relative path back to markdown so
// the file stays portable, instead of Turndown's default which would
// serialize the (machine-specific, huge) asset:// URL.
turndown.addRule('image', {
  filter: 'img',
  replacement: function (_content, node) {
    const el = node as HTMLElement;
    const relativeSrc = el.getAttribute('data-relative-src');
    const src = relativeSrc || el.getAttribute('src') || '';
    const alt = el.getAttribute('alt') || '';
    if (!src) return '';
    return `![${alt}](${src})`;
  },
});

// Configure marked (Markdown → HTML)
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Convert HTML string to Markdown.
 */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

/**
 * Convert Markdown string to HTML.
 *
 * @param baseDir - If given (and running in Tauri), relative image srcs
 *   (e.g. `assets/foo.png`, from images saved via saveImageAsset) are
 *   resolved against this directory and rewritten to a webview-loadable
 *   `asset://` URL, while the original relative path is preserved in a
 *   `data-relative-src` attribute so re-saving round-trips correctly.
 */
export function markdownToHtml(md: string, baseDir?: string): string {
  const html = marked.parse(md) as string;
  if (!baseDir || !isTauri()) return html;

  return html.replace(/<img([^>]*?)\ssrc="([^"]*)"([^>]*)>/g, (match, pre, src, post) => {
    if (!src || /^(https?:|data:|asset:|file:|\/\/)/.test(src)) return match;
    const absolutePath = `${baseDir}/${src}`;
    const resolvedSrc = convertFileSrc(absolutePath);
    return `<img${pre} src="${resolvedSrc}" data-relative-src="${src}"${post}>`;
  });
}

// =================== FRONTMATTER (YAML-lite) ===================
// A deliberately simple flat `key: value` frontmatter block — not full
// YAML (no nesting/arrays/quoting rules), so no extra dependency is
// needed. Good enough for title/tags/date-style metadata.

export type Frontmatter = Record<string, string>;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;

/**
 * Split a markdown file's raw content into its frontmatter block (if any)
 * and the remaining body. Returns `frontmatter: null` when there's no
 * leading `---` block.
 */
export function parseFrontmatter(md: string): { frontmatter: Frontmatter | null; body: string } {
  const match = md.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: null, body: md };

  const frontmatter: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) frontmatter[key] = value;
  }
  return { frontmatter, body: md.slice(match[0].length) };
}

/**
 * Re-attach a frontmatter block to a markdown body before saving. Keys
 * with empty values are dropped; if nothing is left, no block is written.
 */
export function serializeFrontmatter(frontmatter: Frontmatter | null, body: string): string {
  if (!frontmatter) return body;
  const lines = Object.entries(frontmatter)
    .filter(([, value]) => value.trim() !== '')
    .map(([key, value]) => `${key}: ${value}`);
  if (lines.length === 0) return body;
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\r?\n+/, '')}`;
}

// =================== SAVE-PATH CONTENT SELECTION ===================

/**
 * Minimal shape of a TipTap `Editor` this module needs — kept structural
 * (rather than importing the real `Editor` type) so callers can pass a
 * plain mock in tests without spinning up a real editor instance.
 */
export interface SaveTextSource {
  getHTML: () => string;
  getText: (options?: { blockSeparator?: string }) => string;
}

/**
 * Decide what should be written to disk for `fileName`, given the
 * editor's current content.
 *
 * Markdown files (.md/.markdown/.mdx/.mdown) round-trip through
 * HTML -> Markdown (turndown) plus frontmatter, same as always.
 *
 * Every other text file (.js/.py/.css/.txt/etc) is opened read/write as a
 * single `<pre><code>` block (see App.tsx's `getEditorContent`) — NOT as
 * markdown. Running that through `htmlToMarkdown` would wrap the file's
 * content in a fenced code block (```lang ... ```) and corrupt it on
 * every save, since turndown always converts `<pre><code>` to a fence.
 * For those files, the plain text is pulled straight out of the editor
 * instead, via TipTap's `getText()`, so what's on disk stays plain text.
 */
export function serializeEditorContentForSave(
  fileName: string,
  editor: SaveTextSource,
  frontmatter: Frontmatter | null,
): string {
  if (!isMarkdownFile(fileName)) {
    return editor.getText({ blockSeparator: '\n' });
  }
  return serializeFrontmatter(frontmatter, htmlToMarkdown(editor.getHTML()));
}

export interface TaggedFile {
  fileId: string;
  fileName: string;
  title?: string;
  date?: string;
}

export interface TagIndexEntry {
  tag: string;
  files: TaggedFile[];
}

/**
 * Walk a folder tree, read every Markdown file's frontmatter, and group
 * files by their `tags` field (comma-separated). Used to power the
 * sidebar's Tags panel — lets you browse files by tag/date without
 * leaving the app, instead of the frontmatter block just sitting inert
 * in each file.
 */
export async function scanFrontmatterIndex(nodes: FileTreeNode[]): Promise<TagIndexEntry[]> {
  const tagMap = new Map<string, TaggedFile[]>();

  async function walk(list: FileTreeNode[]): Promise<void> {
    for (const node of list) {
      if (node.isDir && node.children) {
        await walk(node.children);
        continue;
      }
      if (node.isDir || !/\.(md|markdown)$/i.test(node.name)) continue;

      let content: string;
      try {
        content = await readTextFile(node.path);
      } catch {
        continue;
      }

      const { frontmatter } = parseFrontmatter(content);
      const tagsRaw = frontmatter?.tags;
      if (!tagsRaw) continue;

      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length === 0) continue;

      const entry: TaggedFile = {
        fileId: node.path,
        fileName: node.name,
        title: frontmatter?.title || undefined,
        date: frontmatter?.date || undefined,
      };
      for (const tag of tags) {
        const key = tag.toLowerCase();
        if (!tagMap.has(key)) tagMap.set(key, []);
        tagMap.get(key)!.push(entry);
      }
    }
  }

  await walk(nodes);

  return Array.from(tagMap.entries())
    .map(([tag, files]) => ({
      tag,
      // Newest-dated files first; undated files sort last.
      files: files.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/**
 * Download a string as a file (browser fallback).
 */
function browserDownload(content: string, filename: string, mimeType = 'text/markdown'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export editor HTML content as a Markdown .md file.
 */
export async function exportAsMarkdown(html: string, filename: string): Promise<void> {
  const md = htmlToMarkdown(html);
  const name = filename.replace(/\.md$/, '') + '.md';

  if (isTauri()) {
    await saveFileDialog(md, name);
  } else {
    browserDownload(md, name, 'text/markdown');
  }
}

/**
 * Export editor HTML content as an .html file.
 */
export async function exportAsHtml(html: string, filename: string): Promise<void> {
  const name = filename.replace(/\.(md|html)$/, '') + '.html';
  const fullHtml = `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Noto Sans Myanmar', 'Inter', sans-serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
      line-height: 1.8;
      color: #1a1a2e;
    }
    pre { background: #f4f4f8; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    blockquote { border-left: 4px solid #6c63ff; padding-left: 1rem; margin-left: 0; color: #555; }
    img { max-width: 100%; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f8; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

  if (isTauri()) {
    await saveFileDialog(fullHtml, name);
  } else {
    browserDownload(fullHtml, name, 'text/html');
  }
}

/**
 * Import a .md file from the user's file system (browser fallback only).
 * In Tauri mode, use openFileDialog from fileManager instead.
 */
export function importMarkdownFileBrowser(): Promise<{ name: string; content: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          content: reader.result as string,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  });
}
