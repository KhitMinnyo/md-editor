/**
 * File Manager — Native filesystem-based file management via Tauri.
 * Falls back to localStorage when running in browser (dev mode without Tauri).
 * All content is stored as UTF-8 strings.
 */
import {
  readTextFile,
  writeTextFile,
  writeFile as writeBinaryFile,
  readDir,
  remove,
  rename as renamePathFs,
  mkdir,
  stat,
  watch as watchFs,
  type WatchEvent,
} from '@tauri-apps/plugin-fs';

export type { WatchEvent };
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';

export interface MdFile {
  id: string;
  name: string;
  content: string;
  path: string; // absolute file path
  createdAt: number;
  updatedAt: number;
}

export interface FileTreeNode {
  name: string;
  path: string;          // absolute path
  isDir: boolean;
  children?: FileTreeNode[];
  file?: MdFile;         // only for .md files
}

const LAST_FOLDER_KEY = 'md-editor-last-folder';
const ACTIVE_FILE_KEY = 'md-editor-active-file';

// File type categorization
const TEXT_EXTENSIONS = new Set([
  'txt', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'json',
  'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'java', 'swift', 'kt',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'ps1',
  'xml', 'svg', 'csv', 'tsv', 'sql', 'graphql',
  'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env',
  'log', 'gitignore', 'dockerignore', 'editorconfig',
  'makefile', 'dockerfile',
  'r', 'lua', 'pl', 'php', 'ex', 'exs', 'erl', 'clj',
  'sass', 'scss', 'less', 'styl',
  'vue', 'svelte', 'astro',
]);

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdx', 'mdown']);

export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return filename.slice(dotIndex + 1).toLowerCase();
}

export function isMarkdownFile(filename: string): boolean {
  return MARKDOWN_EXTENSIONS.has(getFileExtension(filename));
}

export function isTextFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return TEXT_EXTENSIONS.has(ext) || MARKDOWN_EXTENSIONS.has(ext);
}

export function isBinaryFile(filename: string): boolean {
  return !isTextFile(filename) && getFileExtension(filename) !== '';
}

export function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === 'pdf';
}

/**
 * Check if running inside Tauri.
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// =================== FOLDER OPERATIONS ===================

/**
 * Open a folder picker dialog and return the selected path.
 */
export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const selected = await openDialog({
    directory: true,
    multiple: false,
    title: 'Select a folder containing Markdown files',
  });
  if (typeof selected === 'string') {
    localStorage.setItem(LAST_FOLDER_KEY, selected);
    return selected;
  }
  return null;
}

/**
 * Get the last opened folder path.
 */
export function getLastFolder(): string | null {
  return localStorage.getItem(LAST_FOLDER_KEY);
}

/**
 * List all .md files in a directory (flat, non-recursive).
 */
export async function listMdFiles(dirPath: string): Promise<MdFile[]> {
  if (!isTauri()) return getLocalStorageFiles();

  try {
    const entries = await readDir(dirPath);
    const mdFiles: MdFile[] = [];

    for (const entry of entries) {
      if (entry.isFile && entry.name && /\.(md|markdown)$/i.test(entry.name)) {
        const filePath = `${dirPath}/${entry.name}`;
        try {
          const content = await readTextFile(filePath);
          mdFiles.push({
            id: filePath,
            name: entry.name,
            content,
            path: filePath,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        } catch {
          // Skip files that can't be read
        }
      }
    }

    // Sort by name
    mdFiles.sort((a, b) => a.name.localeCompare(b.name));
    return mdFiles;
  } catch {
    return [];
  }
}

/**
 * Recursively scan a directory and return a tree of ALL files.
 * Does NOT read file content — only lists names and paths for speed.
 */
export async function listFileTree(dirPath: string): Promise<FileTreeNode[]> {
  if (!isTauri()) return [];

  try {
    const entries = await readDir(dirPath);
    const nodes: FileTreeNode[] = [];

    for (const entry of entries) {
      if (!entry.name || entry.name.startsWith('.')) continue;

      const entryPath = `${dirPath}/${entry.name}`;

      if (entry.isDirectory) {
        const children = await listFileTree(entryPath);
        if (children.length > 0) {
          nodes.push({
            name: entry.name,
            path: entryPath,
            isDir: true,
            children,
          });
        }
      } else if (entry.isFile) {
        nodes.push({
          name: entry.name,
          path: entryPath,
          isDir: false,
          file: {
            id: entryPath,
            name: entry.name,
            content: '',  // content loaded on-demand when file is selected
            path: entryPath,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
      }
    }

    // Sort: folders first, then files, both alphabetically
    nodes.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch {
    return [];
  }
}

/**
 * Flatten a file tree into a flat array of MdFile.
 */
export function flattenTree(nodes: FileTreeNode[]): MdFile[] {
  const files: MdFile[] = [];
  for (const node of nodes) {
    if (node.isDir && node.children) {
      files.push(...flattenTree(node.children));
    } else if (node.file) {
      files.push(node.file);
    }
  }
  return files;
}

// =================== FILE OPERATIONS ===================

/**
 * Read a file's content.
 */
export async function readFile(filePath: string): Promise<string> {
  if (!isTauri()) {
    const files = getLocalStorageFiles();
    const file = files.find((f) => f.id === filePath);
    return file?.content ?? '';
  }
  return readTextFile(filePath);
}

/**
 * Save content to a file.
 */
export async function saveFile(filePath: string, content: string): Promise<void> {
  if (!isTauri()) {
    updateLocalStorageFile(filePath, content);
    return;
  }
  await writeTextFile(filePath, content);
}

/**
 * Create a new .md file in the given directory.
 */
export async function createNewFile(dirPath: string, fileName: string): Promise<MdFile> {
  const name = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
  const filePath = `${dirPath}/${name}`;

  if (!isTauri()) {
    return createLocalStorageFile(name);
  }

  const defaultContent = '';
  await writeTextFile(filePath, defaultContent);

  return {
    id: filePath,
    name,
    content: defaultContent,
    path: filePath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Delete a file.
 */
export async function deleteFileNative(filePath: string): Promise<void> {
  if (!isTauri()) {
    deleteLocalStorageFile(filePath);
    return;
  }
  await remove(filePath);
}

/**
 * Move a file into a `.trash/` folder next to it instead of deleting it
 * outright, so an accidental delete can still be recovered from the OS
 * file browser. Only used in Tauri mode — the browser/localStorage
 * fallback has no real files to preserve.
 */
export async function trashFile(rootFolder: string, filePath: string): Promise<void> {
  const trashDir = `${rootFolder}/.trash`;
  try {
    await mkdir(trashDir);
  } catch {
    // Already exists — fine.
  }
  const name = filePath.split('/').pop() || 'untitled';
  const trashedName = `${Date.now()}-${name}`;
  await renamePathFs(filePath, `${trashDir}/${trashedName}`);
}

// =================== RENAME / FOLDERS ===================

/**
 * Rename (or move) a file or folder.
 */
export async function renamePathNative(oldPath: string, newPath: string): Promise<void> {
  if (!isTauri()) return;
  await renamePathFs(oldPath, newPath);
}

/**
 * Create a new folder inside dirPath.
 */
export async function createFolder(dirPath: string, name: string): Promise<string> {
  const newPath = `${dirPath}/${name}`;
  if (isTauri()) {
    await mkdir(newPath);
  }
  return newPath;
}

/**
 * Get a file/folder's last-modified time (ms since epoch), or null if it
 * can't be determined (e.g. running in browser mode, or the path no
 * longer exists).
 */
export async function getFileMtime(filePath: string): Promise<number | null> {
  if (!isTauri()) return null;
  try {
    const info = await stat(filePath);
    return info.mtime ? new Date(info.mtime).getTime() : null;
  } catch {
    return null;
  }
}

// =================== FILE WATCHING ===================

/**
 * Watch a folder (recursively) for filesystem changes made by anything
 * other than this app — another editor, `git checkout`, a sync client,
 * or an AI coding agent writing files into the open folder. The sidebar
 * and the currently open file otherwise only notice such changes when
 * the app regains window focus (see App.tsx's `checkActiveFileForExternalChange`),
 * which misses changes made while the app stays focused/visible.
 *
 * `delayMs` debounces bursts of events (e.g. an agent writing many files
 * in a row) into a single callback. Returns an unwatch function the
 * caller must invoke when the folder changes or the component unmounts;
 * a no-op function outside Tauri.
 */
export async function watchFolder(
  dirPath: string,
  onChange: (event: WatchEvent) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  return watchFs(dirPath, onChange, { recursive: true, delayMs: 400 });
}

// =================== IMAGE ASSETS ===================

/**
 * Save pasted/dropped image bytes as a real file under `assets/` next to
 * the currently open document, instead of inlining it as a base64 data
 * URL (which bloats the .md file and doesn't diff well in git).
 * Returns the path to use as the <img src>, relative to dirPath.
 */
export async function saveImageAsset(
  dirPath: string,
  fileName: string,
  data: Uint8Array,
): Promise<string> {
  const assetsDir = `${dirPath}/assets`;
  try {
    await mkdir(assetsDir);
  } catch {
    // Already exists — fine.
  }
  // Avoid clobbering an existing asset with the same name.
  const uniqueName = `${Date.now()}-${fileName}`;
  await writeBinaryFile(`${assetsDir}/${uniqueName}`, data);
  return `assets/${uniqueName}`;
}

// =================== RECENT FILES ===================

const RECENT_FILES_KEY = 'md-editor-recent-files';
const MAX_RECENT_FILES = 10;

export interface RecentFile {
  id: string;
  name: string;
  openedAt: number;
}

export function getRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentFile[];
  } catch {
    return [];
  }
}

export function addRecentFile(id: string, name: string): void {
  const existing = getRecentFiles().filter((f) => f.id !== id);
  const next = [{ id, name, openedAt: Date.now() }, ...existing].slice(0, MAX_RECENT_FILES);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
}

export function removeRecentFile(id: string): void {
  const next = getRecentFiles().filter((f) => f.id !== id);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
}

// =================== SEARCH ===================

export interface SearchMatch {
  fileId: string;
  fileName: string;
  lineNumber: number;
  snippet: string;
}

const MAX_MATCHES_PER_FILE = 5;
const MAX_TOTAL_MATCHES = 100;

/**
 * Recursively search text/markdown files in a folder tree for a query
 * string (case-insensitive). Binary files are skipped. Results are
 * capped to keep this responsive on large folders.
 */
export async function searchInTree(nodes: FileTreeNode[], query: string): Promise<SearchMatch[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchMatch[] = [];

  async function walk(list: FileTreeNode[]): Promise<void> {
    for (const node of list) {
      if (results.length >= MAX_TOTAL_MATCHES) return;
      if (node.isDir && node.children) {
        await walk(node.children);
        continue;
      }
      if (node.isDir || !node.file) continue;
      if (isBinaryFile(node.name)) continue;

      let content: string;
      try {
        content = await readTextFile(node.path);
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);
      let matchesInFile = 0;
      for (let i = 0; i < lines.length; i++) {
        if (matchesInFile >= MAX_MATCHES_PER_FILE || results.length >= MAX_TOTAL_MATCHES) break;
        if (lines[i].toLowerCase().includes(q)) {
          results.push({
            fileId: node.path,
            fileName: node.name,
            lineNumber: i + 1,
            snippet: lines[i].trim().slice(0, 160),
          });
          matchesInFile++;
        }
      }
    }
  }

  await walk(nodes);
  return results;
}

/**
 * Open a file via native dialog.
 */
export async function openFileDialog(): Promise<{ name: string; content: string; path: string } | null> {
  if (!isTauri()) return null;

  const selected = await openDialog({
    multiple: false,
    title: 'Open Markdown File',
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
  });

  if (typeof selected === 'string') {
    const content = await readTextFile(selected);
    const name = selected.split('/').pop() || 'Untitled.md';
    return { name, content, path: selected };
  }
  return null;
}

/**
 * Save file via native "Save As" dialog.
 */
export async function saveFileDialog(content: string, defaultName: string): Promise<string | null> {
  if (!isTauri()) return null;

  const filePath = await saveDialog({
    title: 'Save File',
    defaultPath: defaultName,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });

  if (filePath) {
    await writeTextFile(filePath, content);
    return filePath;
  }
  return null;
}

// =================== ACTIVE FILE ===================

export function getActiveFileId(): string | null {
  return localStorage.getItem(ACTIVE_FILE_KEY);
}

export function setActiveFileId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_FILE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_FILE_KEY);
  }
}

// =================== AUTO-SAVE ===================

export function createAutoSave(delayMs = 1000) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (filePath: string, content: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      await saveFile(filePath, content);
      timer = null;
    }, delayMs);
  };
}

// =================== WELCOME FILE ===================

/**
 * Create a welcome file in the given folder if no .md files exist.
 */
export async function ensureWelcomeFile(dirPath: string): Promise<void> {
  if (!isTauri()) return;

  const files = await listMdFiles(dirPath);
  if (files.length > 0) return;

  const welcomeContent = `# Welcome to MD Editor 🎉

This editor lets you edit **Markdown** files as easily as Microsoft Word.

## ✨ Features

- **WYSIWYG Editing** — write and see the formatted result as you type
- **Myanmar Unicode** — full Myanmar Unicode support
- **Dark / Light Mode** — switch between light and dark themes
- **Native App** — built with Tauri as a native Mac app

## 📝 Markdown Syntax

### Text Formatting

**Bold text** | *Italic text* | ~~Strikethrough~~

### Lists

1. First item
2. Second item
3. Third item

- Bullet point
- Another point

### Code

\`inline code\` or code blocks:

\`\`\`javascript
console.log("Hello, MD Editor!");
\`\`\`

### Blockquote

> You can write a note-worthy paragraph like this.

---

Start writing! 🚀
`;

  await writeTextFile(`${dirPath}/Welcome.md`, welcomeContent);
}

// =================== LOCAL STORAGE FALLBACK ===================
// Used when running in browser (dev mode without Tauri)

const LS_KEY = 'md-editor-files';

function getLocalStorageFiles(): MdFile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return initLocalStorageDefaults();
    return JSON.parse(raw) as MdFile[];
  } catch {
    return [];
  }
}

function saveLocalStorageFiles(files: MdFile[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(files));
}

function createLocalStorageFile(name: string): MdFile {
  const files = getLocalStorageFiles();
  const newFile: MdFile = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.endsWith('.md') ? name : `${name}.md`,
    content: '',
    path: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  files.push(newFile);
  saveLocalStorageFiles(files);
  return newFile;
}

function updateLocalStorageFile(id: string, content: string): void {
  const files = getLocalStorageFiles();
  const index = files.findIndex((f) => f.id === id);
  if (index !== -1) {
    files[index] = { ...files[index], content, updatedAt: Date.now() };
    saveLocalStorageFiles(files);
  }
}

function deleteLocalStorageFile(id: string): void {
  const files = getLocalStorageFiles().filter((f) => f.id !== id);
  saveLocalStorageFiles(files);
}

function initLocalStorageDefaults(): MdFile[] {
  const welcome: MdFile = {
    id: `file-${Date.now()}`,
    name: 'Welcome.md',
    content: `<h1>Welcome to MD Editor 🎉</h1><p>This editor lets you edit <strong>Markdown</strong> files as easily as Microsoft Word.</p><p>Start writing! 🚀</p>`,
    path: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveLocalStorageFiles([welcome]);
  return [welcome];
}
