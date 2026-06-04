/**
 * Markdown ↔ HTML conversion utilities and file export helpers.
 * Uses Tauri native dialogs when available, falls back to browser APIs.
 */
import TurndownService from 'turndown';
import { marked } from 'marked';
import { isTauri, saveFileDialog } from './fileManager';

// Configure Turndown (HTML → Markdown)
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
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
 */
export function markdownToHtml(md: string): string {
  return marked.parse(md) as string;
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
