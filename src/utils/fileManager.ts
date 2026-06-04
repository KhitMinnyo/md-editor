/**
 * File Manager — Native filesystem-based file management via Tauri.
 * Falls back to localStorage when running in browser (dev mode without Tauri).
 * All content is stored as UTF-8 strings.
 */
import { readTextFile, writeTextFile, readDir, remove } from '@tauri-apps/plugin-fs';
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
    title: 'Markdown ဖိုင်များရှိသော folder ကိုရွေးချယ်ပါ',
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
 * Open a file via native dialog.
 */
export async function openFileDialog(): Promise<{ name: string; content: string; path: string } | null> {
  if (!isTauri()) return null;

  const selected = await openDialog({
    multiple: false,
    title: 'Markdown ဖိုင်ဖွင့်ပါ',
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
    title: 'ဖိုင်သိမ်းဆည်းပါ',
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

  const welcomeContent = `# MD Editor မှ ကြိုဆိုပါတယ် 🎉

ဒီ editor ကို **Markdown** ဖိုင်တွေကို Microsoft Word လိုမျိုး အလွယ်တကူ ပြင်ဆင်ဖို့ ဖန်တီးထားပါတယ်။

## ✨ Features

- **WYSIWYG Editing** — မြင်ရတဲ့အတိုင်း ရေးသားနိုင်ပါတယ်
- **Myanmar Unicode** — မြန်မာစာ ယူနီကုဒ် အပြည့်အဝ support လုပ်ပါတယ်
- **Dark / Light Mode** — အလင်း/အမှောင် theme ပြောင်းလဲနိုင်ပါတယ်
- **Native App** — Tauri နဲ့ native Mac app အဖြစ် ဖန်တီးထားပါတယ်

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

> မှတ်သားဖွယ် စာပိုဒ်တစ်ခုကို ဒီလိုရေးနိုင်ပါတယ်။

---

စာရေးဖို့ စလိုက်ပါ! 🚀
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
    content: `<h1>MD Editor မှ ကြိုဆိုပါတယ် 🎉</h1><p>ဒီ editor ကို <strong>Markdown</strong> ဖိုင်တွေကို Microsoft Word လိုမျိုး ပြင်ဆင်ဖို့ ဖန်တီးထားပါတယ်။</p><p>စာရေးဖို့ စလိုက်ပါ! 🚀</p>`,
    path: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveLocalStorageFiles([welcome]);
  return [welcome];
}
