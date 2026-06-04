import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/core';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import EditorComponent from './components/Editor';
import StatusBar from './components/StatusBar';
import type { MdFile, FileTreeNode } from './utils/fileManager';
import {
  isTauri,
  pickFolder,
  getLastFolder,
  listMdFiles,
  listFileTree,
  flattenTree,
  readFile,
  saveFile,
  createNewFile,
  deleteFileNative,
  openFileDialog,
  getActiveFileId,
  setActiveFileId,
  createAutoSave,
  isMarkdownFile,
  isBinaryFile,
  getFileExtension,
} from './utils/fileManager';
import {
  exportAsMarkdown,
  exportAsHtml,
  markdownToHtml,
  htmlToMarkdown,
  importMarkdownFileBrowser,
} from './utils/markdown';

type Theme = 'light' | 'dark';
type SaveStatus = 'saved' | 'saving' | 'unsaved';

const autoSave = createAutoSave(800);

export default function App() {
  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('md-editor-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Folder & Files
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<MdFile[]>([]);
  const [treeNodes, setTreeNodes] = useState<FileTreeNode[]>([]);
  const [activeFileId, setActiveFile] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Editor ref
  const editorRef = useRef<Editor | null>(null);

  /**
   * Load folder: scan tree + flatten to files list
   */
  const loadFolder = useCallback(async (folderPath: string) => {
    if (isTauri()) {
      const tree = await listFileTree(folderPath);
      setTreeNodes(tree);
      const flat = flattenTree(tree);
      setFiles(flat);
      return flat;
    } else {
      const mdFiles = await listMdFiles('');
      setFiles(mdFiles);
      return mdFiles;
    }
  }, []);

  /**
   * Open a file by its absolute path.
   * Sets the parent folder as current, loads files, and selects the target.
   */
  const openFileByPath = useCallback(async (filePath: string) => {
    try {
      const parts = filePath.split('/');
      const fileName = parts.pop() || 'Untitled.md';
      const dirPath = parts.join('/');

      // Read the file content
      const content = await readFile(filePath);

      // Set the folder
      setCurrentFolder(dirPath);
      localStorage.setItem('md-editor-last-folder', dirPath);

      // Load all files in that folder (recursive tree)
      await loadFolder(dirPath);

      // Inject content into files state and set active
      setFiles((prev) => {
        const exists = prev.some((f) => f.path === filePath || f.id === filePath);
        if (exists) {
          return prev.map((f) =>
            (f.path === filePath || f.id === filePath) ? { ...f, content } : f
          );
        } else {
          return [...prev, {
            id: filePath,
            name: fileName,
            content,
            path: filePath,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }];
        }
      });
      setActiveFile(filePath);
      setActiveFileId(filePath);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [loadFolder]);

  // Initialize — load last folder, and check for "Open With" files in background
  useEffect(() => {
    let cancelled = false;

    async function loadLastFolder() {
      if (!isTauri()) {
        const mdFiles = await listMdFiles('');
        if (cancelled) return;
        setFiles(mdFiles);
        const storedActive = getActiveFileId();
        if (storedActive && mdFiles.some((f) => f.id === storedActive)) {
          setActiveFile(storedActive);
        } else if (mdFiles.length > 0) {
          setActiveFile(mdFiles[0].id);
          setActiveFileId(mdFiles[0].id);
        }
        return;
      }

      // Load last folder right away (no delay for normal launches)
      const lastFolder = getLastFolder();
      if (lastFolder) {
        setCurrentFolder(lastFolder);
        const mdFiles = await loadFolder(lastFolder);
        if (cancelled) return;
        const storedActive = getActiveFileId();
        if (storedActive && mdFiles.some((f) => f.id === storedActive)) {
          setActiveFile(storedActive);
        } else if (mdFiles.length > 0) {
          setActiveFile(mdFiles[0].id);
          setActiveFileId(mdFiles[0].id);
        }
      }
    }

    async function checkOpenedFiles() {
      if (!isTauri()) return;
      // Poll for files opened via "Open With" / file association.
      // macOS Apple Event can arrive ~10 seconds after app launch,
      // so we poll for up to 20 seconds.
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        for (let attempt = 0; attempt < 40; attempt++) {
          if (cancelled) return;
          const openedFiles = await invoke<string[]>('get_opened_files');
          if (openedFiles && openedFiles.length > 0) {
            console.log('[MD Editor] File opened via association:', openedFiles[0]);
            await openFileByPath(openedFiles[0]);
            await invoke('clear_opened_files');
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (err) {
        console.error('Failed to get opened files:', err);
      }
    }

    // Run both in parallel — folder loads instantly, file check polls in background
    loadLastFolder();
    checkOpenedFiles();

    return () => { cancelled = true; };
  }, [openFileByPath, loadFolder]);

  // Listen for files opened while app is already running (e.g. double-click another .md file)
  // Also acts as backup for initial file open in case polling misses it.
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<string[]>('file-open', (event) => {
          console.log('[MD Editor] file-open event received:', event.payload);
          if (event.payload && event.payload.length > 0) {
            openFileByPath(event.payload[0]);
          }
        });
      } catch (err) {
        console.error('Failed to set up file-open listener:', err);
      }
    })();

    // Also check on window focus (in case Apple Event arrived while polling was done)
    const handleWindowFocus = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const openedFiles = await invoke<string[]>('get_opened_files');
        if (openedFiles && openedFiles.length > 0) {
          await openFileByPath(openedFiles[0]);
          await invoke('clear_opened_files');
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (unlisten) unlisten();
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [openFileByPath]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('md-editor-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Active file content
  const activeFile = files.find((f) => f.id === activeFileId);

  // Open folder (Tauri native)
  const handleOpenFolder = useCallback(async () => {
    const folder = await pickFolder();
    if (!folder) return;
    setCurrentFolder(folder);
    await loadFolder(folder);
    setActiveFile(null);
    setActiveFileId(null);
  }, [loadFolder]);

  // Select file — load content on-demand before showing in editor
  const handleSelectFile = useCallback(async (id: string) => {
    setSaveStatus('saved');
    // Check if it's a binary file
    const fileName = id.split('/').pop() || '';
    if (isBinaryFile(fileName)) {
      // Still set active to show the unsupported message
      setActiveFile(id);
      setActiveFileId(id);
      return;
    }
    // Load content on-demand if not loaded yet
    if (isTauri()) {
      const existingFile = files.find((f) => f.id === id);
      if (existingFile && !existingFile.content) {
        try {
          const content = await readFile(id);
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, content } : f)),
          );
        } catch (err) {
          console.error('Failed to read file:', err);
        }
      }
    }
    // Set active AFTER content is loaded
    setActiveFile(id);
    setActiveFileId(id);
  }, [files]);

  // Create file
  const handleCreateFile = useCallback(
    async (name: string) => {
      const dir = currentFolder || '';
      const newFile = await createNewFile(dir, name);
      await loadFolder(dir || '');
      setActiveFile(newFile.id);
      setActiveFileId(newFile.id);
    },
    [currentFolder, loadFolder],
  );

  // Delete file
  const handleDeleteFile = useCallback(
    async (id: string) => {
      if (!window.confirm('ဒီဖိုင်ကို ဖျက်ချင်တာ သေချာပါသလား?')) return;
      await deleteFileNative(id);
      const remaining = await loadFolder(currentFolder || '');
      if (id === activeFileId) {
        const next = remaining.length > 0 ? remaining[0].id : null;
        setActiveFile(next);
        setActiveFileId(next);
      }
    },
    [activeFileId, currentFolder, loadFolder],
  );

  // Editor content update
  const handleEditorUpdate = useCallback(
    (html: string) => {
      if (!activeFileId) return;
      setSaveStatus('saving');

      // For native: convert HTML to Markdown before saving
      const contentToSave = isTauri() ? htmlToMarkdown(html) : html;
      autoSave(activeFileId, contentToSave);

      // Update local state optimistically
      setFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId ? { ...f, content: isTauri() ? contentToSave : html, updatedAt: Date.now() } : f,
        ),
      );
      setTimeout(() => setSaveStatus('saved'), 1000);
    },
    [activeFileId],
  );

  // Export
  const handleExportMarkdown = useCallback(async () => {
    if (!editorRef.current || !activeFile) return;
    await exportAsMarkdown(editorRef.current.getHTML(), activeFile.name);
  }, [activeFile]);

  const handleExportHtml = useCallback(async () => {
    if (!editorRef.current || !activeFile) return;
    await exportAsHtml(editorRef.current.getHTML(), activeFile.name);
  }, [activeFile]);

  // Import
  const handleImportFile = useCallback(async () => {
    if (isTauri()) {
      const result = await openFileDialog();
      if (!result) return;
      // Reload file list if in folder mode
      if (currentFolder) {
        const mdFiles = await loadFolder(currentFolder);
        // Select the opened file if it's in the current folder
        const existing = mdFiles.find((f) => f.path === result.path);
        if (existing) {
          setActiveFile(existing.id);
          setActiveFileId(existing.id);
        }
      }
    } else {
      const result = await importMarkdownFileBrowser();
      if (!result) return;
      const html = markdownToHtml(result.content);
      const { createNewFile: createLS } = await import('./utils/fileManager');
      const newFile = await createLS('', result.name);
      newFile.content = html;
      await saveFile(newFile.id, html);
      const mdFiles = await listMdFiles('');
      setFiles(mdFiles);
      setActiveFile(newFile.id);
      setActiveFileId(newFile.id);
    }
  }, [currentFolder, loadFolder]);

  // Get editor content — handle markdown vs text files
  const getEditorContent = useCallback(() => {
    if (!activeFile) return '';
    if (isTauri()) {
      if (isMarkdownFile(activeFile.name)) {
        return markdownToHtml(activeFile.content);
      }
      // For text/code files, wrap in a code block
      const ext = getFileExtension(activeFile.name);
      const escaped = activeFile.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre><code class="language-${ext}">${escaped}</code></pre>`;
    }
    return activeFile.content;
  }, [activeFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        if (activeFileId && editorRef.current) {
          const contentToSave = isTauri()
            ? htmlToMarkdown(editorRef.current.getHTML())
            : editorRef.current.getHTML();
          saveFile(activeFileId, contentToSave);
          setSaveStatus('saved');
        }
      }
      if (mod && e.key === 'n') {
        e.preventDefault();
        const name = window.prompt('ဖိုင်အမည်ထည့်ပါ:', 'Untitled.md');
        if (name) handleCreateFile(name);
      }
      if (mod && e.key === 'o') {
        e.preventDefault();
        if (mod && e.shiftKey) {
          handleOpenFolder();
        } else {
          handleImportFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, handleCreateFile, handleImportFile, handleOpenFolder]);

  return (
    <div className="app-layout">
      <Sidebar
        files={files}
        treeNodes={treeNodes}
        activeFileId={activeFileId}
        onSelectFile={handleSelectFile}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        onOpenFolder={handleOpenFolder}
        currentFolder={currentFolder}
      />
      <div className="main-content">
        <Toolbar
          editor={editorRef.current}
          onExportMarkdown={handleExportMarkdown}
          onExportHtml={handleExportHtml}
          onImportFile={handleImportFile}
        />
        {activeFile ? (
          isBinaryFile(activeFile.name) ? (
            <div className="editor-container">
              <div className="empty-state fade-in">
                <div className="empty-state-icon">📦</div>
                <p className="empty-state-text">
                  <strong>{activeFile.name}</strong>
                </p>
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                  .{getFileExtension(activeFile.name)} ဖိုင်ကို ဖွင့်၍မရပါ (Unsupported file type)
                </p>
              </div>
            </div>
          ) : (
            <EditorComponent
              key={activeFileId}
              content={getEditorContent()}
              onUpdate={handleEditorUpdate}
              editorRef={editorRef}
            />
          )
        ) : (
          <div className="editor-container">
            <div className="empty-state fade-in">
              <div className="empty-state-icon">📝</div>
              <p className="empty-state-text">
                {currentFolder
                  ? 'ဖိုင်တစ်ခုကို ရွေးချယ်ပါ သို့မဟုတ် ဖိုင်အသစ်ဖန်တီးပါ'
                  : isTauri()
                    ? 'Folder တစ်ခု ဖွင့်ပါ (Cmd+Shift+O)'
                    : 'ဖိုင်တစ်ခုကို ရွေးချယ်ပါ သို့မဟုတ် ဖိုင်အသစ်ဖန်တီးပါ'}
              </p>
              {!currentFolder && isTauri() && (
                <button
                  className="toolbar-btn"
                  style={{
                    width: 'auto',
                    padding: '8px 20px',
                    background: 'var(--color-accent)',
                    color: 'var(--color-text-inverse)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-primary)',
                  }}
                  onClick={handleOpenFolder}
                >
                  Folder ဖွင့်ပါ
                </button>
              )}
            </div>
          </div>
        )}
        <StatusBar
          editor={editorRef.current}
          theme={theme}
          onToggleTheme={toggleTheme}
          saveStatus={saveStatus}
        />
      </div>
    </div>
  );
}
