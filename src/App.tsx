import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/core';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import EditorComponent, { type SavedImage } from './components/Editor';
import PdfViewer from './components/PdfViewer';
import StatusBar from './components/StatusBar';
import SettingsDialog from './components/SettingsDialog';
import Outline from './components/Outline';
import FindReplaceBar from './components/FindReplaceBar';
import MetadataBar from './components/MetadataBar';
import type { MdFile, FileTreeNode, RecentFile, SearchMatch } from './utils/fileManager';
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
  createFolder,
  renamePathNative,
  deleteFileNative,
  trashFile,
  openFileDialog,
  getActiveFileId,
  setActiveFileId,
  isMarkdownFile,
  isBinaryFile,
  isPdfFile,
  getFileExtension,
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  searchInTree,
  getFileMtime,
  saveImageAsset,
} from './utils/fileManager';
import {
  exportAsMarkdown,
  exportAsHtml,
  markdownToHtml,
  htmlToMarkdown,
  importMarkdownFileBrowser,
  parseFrontmatter,
  serializeFrontmatter,
  scanFrontmatterIndex,
  type Frontmatter,
  type TagIndexEntry,
} from './utils/markdown';
import { getSettings, saveSettings, type AppSettings } from './utils/settings';

type Theme = 'light' | 'dark';
type SaveStatus = 'saved' | 'saving' | 'unsaved';

export default function App() {
  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('md-editor-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-max-width', `${settings.editorMaxWidth}px`);
  }, [settings.editorMaxWidth]);

  const handleSaveSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  // Folder & Files
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<MdFile[]>([]);
  const [treeNodes, setTreeNodes] = useState<FileTreeNode[]>([]);
  const [activeFileId, setActiveFile] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [reloadNonce, setReloadNonce] = useState(0);

  // Recent files
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => getRecentFiles());
  const refreshRecentFiles = useCallback(() => setRecentFiles(getRecentFiles()), []);
  const handleRemoveRecentFile = useCallback((id: string) => {
    removeRecentFile(id);
    refreshRecentFiles();
  }, [refreshRecentFiles]);

  // Panels
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  // Editor ref — for imperative access (export, keyboard shortcuts) outside
  // of render. Mutating a ref doesn't trigger a re-render on its own, so
  // anything that needs to *render* based on editor readiness (Toolbar,
  // StatusBar) uses `editorInstance` state instead — see handleEditorReady.
  const editorRef = useRef<Editor | null>(null);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const handleEditorReady = useCallback((ed: Editor | null) => {
    setEditorInstance(ed);
  }, []);

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

  // Last-known mtime of the active file, used to detect edits made outside
  // this app (see the window-focus handler below).
  const lastKnownMtimeRef = useRef<number | null>(null);
  const trackMtime = useCallback(async (id: string) => {
    lastKnownMtimeRef.current = await getFileMtime(id);
  }, []);

  // Pending-save bookkeeping, declared up here (rather than down by
  // handleEditorUpdate/flushPendingSave where they're mainly used) because
  // the window-focus handler below also reads them to decide whether it's
  // safe to auto-reload an externally-changed file.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHtmlRef = useRef<string | null>(null);
  // Mirrors activeFileId in a ref so close/unload/focus handlers (which
  // can't depend on React state directly) always see the current file.
  const activeFileIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

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
      addRecentFile(filePath, fileName);
      refreshRecentFiles();
      trackMtime(filePath);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [loadFolder, refreshRecentFiles, trackMtime]);

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
        const targetId = (storedActive && mdFiles.some((f) => f.id === storedActive))
          ? storedActive
          : mdFiles.length > 0 ? mdFiles[0].id : null;

        if (targetId) {
          // Read content from disk before setting active
          try {
            const content = await readFile(targetId);
            setFiles((prev) =>
              prev.map((f) => (f.id === targetId ? { ...f, content } : f)),
            );
          } catch (err) {
            console.error('Failed to read initial file:', err);
          }
          setActiveFile(targetId);
          setActiveFileId(targetId);
          trackMtime(targetId);
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
  }, [openFileByPath, loadFolder, trackMtime]);

  // Listen for files opened while app is already running (e.g. double-click another .md file)
  // Also acts as backup for initial file open in case polling misses it, and
  // checks whether the active file changed on disk while we were away.
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
          return;
        }
      } catch {
        // ignore
      }

      // Detect edits made outside this app (another editor, git checkout,
      // sync conflict, etc). Only auto-reload when there's no in-flight
      // local edit — otherwise we'd risk clobbering what the user just
      // typed, or overwriting their change on the next autosave.
      const id = activeFileIdRef.current;
      if (!id || pendingHtmlRef.current) return;
      try {
        const mtime = await getFileMtime(id);
        if (mtime !== null && lastKnownMtimeRef.current !== null && mtime > lastKnownMtimeRef.current) {
          const content = await readFile(id);
          setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, content } : f)));
          lastKnownMtimeRef.current = mtime;
          setReloadNonce((n) => n + 1);
        }
      } catch (err) {
        console.error('Failed to check for external file changes:', err);
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
  const activeFileDir = activeFile ? activeFile.path.split('/').slice(0, -1).join('/') : '';

  // Frontmatter (YAML-lite metadata block) for the active markdown file.
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({});
  const frontmatterRef = useRef<Frontmatter>({});
  useEffect(() => {
    frontmatterRef.current = frontmatter;
  }, [frontmatter]);

  useEffect(() => {
    if (!activeFile || !isTauri() || !isMarkdownFile(activeFile.name)) {
      setFrontmatter({});
      return;
    }
    const { frontmatter: fm } = parseFrontmatter(activeFile.content);
    setFrontmatter(fm ?? {});
  }, [activeFile]);

  // Open folder (Tauri native)
  const handleOpenFolder = useCallback(async () => {
    const folder = await pickFolder();
    if (!folder) return;
    setCurrentFolder(folder);
    await loadFolder(folder);
    setActiveFile(null);
    setActiveFileId(null);
  }, [loadFolder]);

  // Select file — always load content from disk before showing in editor
  const handleSelectFile = useCallback(async (id: string) => {
    setSaveStatus('saved');
    const fileName = id.split('/').pop() || '';
    if (isBinaryFile(fileName)) {
      setActiveFile(id);
      setActiveFileId(id);
      addRecentFile(id, fileName);
      refreshRecentFiles();
      return;
    }
    if (isTauri()) {
      try {
        const content = await readFile(id);
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, content } : f)),
        );
        setActiveFile(id);
        setActiveFileId(id);
        trackMtime(id);
      } catch (err) {
        console.error('Failed to read file:', err);
        setActiveFile(id);
        setActiveFileId(id);
      }
    } else {
      setActiveFile(id);
      setActiveFileId(id);
    }
    addRecentFile(id, fileName);
    refreshRecentFiles();
  }, [refreshRecentFiles, trackMtime]);

  // Create file — dirPath defaults to the current folder root when omitted.
  const handleCreateFile = useCallback(
    async (name: string, dirPath?: string) => {
      const dir = dirPath ?? currentFolder ?? '';
      const newFile = await createNewFile(dir, name);
      await loadFolder(currentFolder || '');
      setActiveFile(newFile.id);
      setActiveFileId(newFile.id);
    },
    [currentFolder, loadFolder],
  );

  // Create folder
  const handleCreateFolder = useCallback(
    async (name: string, dirPath?: string) => {
      const dir = dirPath ?? currentFolder ?? '';
      await createFolder(dir, name);
      await loadFolder(currentFolder || '');
    },
    [currentFolder, loadFolder],
  );

  // Rename a file or folder in place.
  const handleRenamePath = useCallback(
    async (oldPath: string, newName: string) => {
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      try {
        await renamePathNative(oldPath, newPath);
      } catch (err) {
        console.error('Failed to rename:', err);
        return;
      }
      await loadFolder(currentFolder || '');
      // `oldPath` may be a folder that contains the active file — rewrite
      // its path/id prefix too, so it doesn't keep pointing at a path that
      // no longer exists (which would silently break the next save).
      if (activeFileId === oldPath) {
        setActiveFile(newPath);
        setActiveFileId(newPath);
      } else if (activeFileId && activeFileId.startsWith(`${oldPath}/`)) {
        const rewritten = newPath + activeFileId.slice(oldPath.length);
        setFiles((prev) =>
          prev.map((f) => (f.id === activeFileId ? { ...f, id: rewritten, path: rewritten } : f)),
        );
        setActiveFile(rewritten);
        setActiveFileId(rewritten);
      }
    },
    [currentFolder, loadFolder, activeFileId],
  );

  // Delete file — moved to .trash/ instead of removed outright (Tauri mode).
  const handleDeleteFile = useCallback(
    async (id: string) => {
      if (!window.confirm('Are you sure you want to delete this file?')) return;
      if (isTauri() && currentFolder) {
        await trashFile(currentFolder, id);
      } else {
        await deleteFileNative(id);
      }
      const remaining = await loadFolder(currentFolder || '');
      // `id` may be a folder path (deleting a folder deletes everything
      // inside it too) — clear the active file if it was inside.
      const activeWasRemoved =
        activeFileId != null && (activeFileId === id || activeFileId.startsWith(`${id}/`));
      if (activeWasRemoved) {
        const next = remaining.length > 0 ? remaining[0].id : null;
        setActiveFile(next);
        setActiveFileId(next);
      }
    },
    [activeFileId, currentFolder, loadFolder],
  );

  // Search across every text/markdown file in the open folder.
  const handleSearch = useCallback(
    (query: string): Promise<SearchMatch[]> => searchInTree(treeNodes, query),
    [treeNodes],
  );

  // Build the frontmatter Tags index for the sidebar's Tags panel.
  const handleLoadTags = useCallback(
    (): Promise<TagIndexEntry[]> => scanFrontmatterIndex(treeNodes),
    [treeNodes],
  );

  // Save a pasted/dropped image as a real file under assets/, next to the
  // current document, instead of inlining it as base64.
  const handleImageFile = useCallback(async (file: File): Promise<SavedImage | null> => {
    if (!isTauri() || !activeFile || !activeFileDir) return null;
    try {
      const buffer = await file.arrayBuffer();
      const relativeSrc = await saveImageAsset(activeFileDir, file.name || 'image.png', new Uint8Array(buffer));
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      const src = convertFileSrc(`${activeFileDir}/${relativeSrc}`);
      return { src, relativeSrc };
    } catch (err) {
      console.error('Failed to save image asset:', err);
      return null;
    }
  }, [activeFile, activeFileDir]);

  // Debounced save — all heavy work happens here, NOT on every keystroke.
  // (saveTimerRef / pendingHtmlRef / activeFileIdRef are declared earlier,
  // near trackMtime, since the window-focus handler also needs them.)

  // Immediately persist whatever edit is pending, bypassing the debounce.
  // Used by the window close handler so in-flight edits aren't lost.
  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pendingHtml = pendingHtmlRef.current;
    const fileId = activeFileIdRef.current;
    if (!pendingHtml || !fileId) return;
    pendingHtmlRef.current = null;

    setSaveStatus('saving');
    let contentToSave = isTauri() ? htmlToMarkdown(pendingHtml) : pendingHtml;
    if (isTauri()) {
      contentToSave = serializeFrontmatter(frontmatterRef.current, contentToSave);
    }
    await saveFile(fileId, contentToSave);
    trackMtime(fileId);
    setSaveStatus('saved');
  }, [trackMtime]);

  const handleEditorUpdate = useCallback(
    (html: string) => {
      if (!activeFileId) return;

      // Store latest HTML, don't process yet
      pendingHtmlRef.current = html;

      // Debounce: only process after the configured delay of no typing
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        flushPendingSave();
      }, settings.autoSaveDelayMs);
    },
    [activeFileId, flushPendingSave, settings.autoSaveDelayMs],
  );

  // Metadata (frontmatter) edits piggyback on the same debounced save path.
  const handleMetadataChange = useCallback(
    (next: Frontmatter) => {
      setFrontmatter(next);
      frontmatterRef.current = next;
      if (!activeFileId || !editorRef.current) return;
      pendingHtmlRef.current = editorRef.current.getHTML();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        flushPendingSave();
      }, settings.autoSaveDelayMs);
    },
    [activeFileId, flushPendingSave, settings.autoSaveDelayMs],
  );

  // Flush any pending debounced save before the window/app actually closes,
  // so edits made right before quitting aren't lost.
  useEffect(() => {
    if (!isTauri()) {
      // Browser/dev fallback: best-effort synchronous flush to localStorage.
      const handleBeforeUnload = () => {
        if (pendingHtmlRef.current && activeFileIdRef.current) {
          saveFile(activeFileIdRef.current, pendingHtmlRef.current);
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        const off = await appWindow.onCloseRequested(() => {
          // Deliberately never call event.preventDefault() here. An earlier
          // version blocked the close until the pending save finished (or
          // failed), which could leave the window permanently unclosable
          // if that save hung or errored for any reason — worse than the
          // data-loss risk it was guarding against. Best-effort: fire the
          // flush in the background and let the close proceed immediately
          // either way. The debounced auto-save already covers the common
          // case; this just shaves off the last <1s of typing before quit.
          if (pendingHtmlRef.current) {
            flushPendingSave().catch((err) =>
              console.error('Failed to flush pending save before close:', err),
            );
          }
        });
        if (cancelled) {
          off();
        } else {
          unlisten = off;
        }
      } catch (err) {
        console.error('Failed to set up close handler:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [flushPendingSave]);

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
        const { body } = parseFrontmatter(activeFile.content);
        return markdownToHtml(body, activeFileDir);
      }
      const ext = getFileExtension(activeFile.name);
      const escaped = activeFile.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre><code class="language-${ext}">${escaped}</code></pre>`;
    }
    return activeFile.content;
  }, [activeFile, activeFileDir]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        if (activeFileId && editorRef.current) {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
          }
          pendingHtmlRef.current = null;
          let contentToSave = isTauri()
            ? htmlToMarkdown(editorRef.current.getHTML())
            : editorRef.current.getHTML();
          if (isTauri()) {
            contentToSave = serializeFrontmatter(frontmatterRef.current, contentToSave);
          }
          saveFile(activeFileId, contentToSave).then(() => trackMtime(activeFileId));
          setSaveStatus('saved');
        }
      }
      if (mod && e.key === 'n') {
        e.preventDefault();
        const name = window.prompt('Enter file name:', 'Untitled.md');
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
      if (mod && e.key === 'f') {
        e.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, handleCreateFile, handleImportFile, handleOpenFolder, trackMtime]);

  const isMd = activeFile ? isMarkdownFile(activeFile.name) : false;

  return (
    <div className="app-layout">
      <Sidebar
        files={files}
        treeNodes={treeNodes}
        activeFileId={activeFileId}
        onSelectFile={handleSelectFile}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        onDeleteFile={handleDeleteFile}
        onRenamePath={handleRenamePath}
        onOpenFolder={handleOpenFolder}
        currentFolder={currentFolder}
        recentFiles={recentFiles}
        onRemoveRecentFile={handleRemoveRecentFile}
        onSearch={handleSearch}
        onLoadTags={handleLoadTags}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="main-content">
        <Toolbar
          editor={editorInstance}
          onExportMarkdown={handleExportMarkdown}
          onExportHtml={handleExportHtml}
          onImportFile={handleImportFile}
          onToggleFind={() => setFindOpen((v) => !v)}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          outlineOpen={outlineOpen}
        />
        <FindReplaceBar editor={editorInstance} isOpen={findOpen} onClose={() => setFindOpen(false)} />
        <div className="content-row">
          <div className="content-column">
            {isTauri() && isMd && activeFile && (
              <MetadataBar frontmatter={frontmatter} onChange={handleMetadataChange} />
            )}
            {activeFile ? (
              isBinaryFile(activeFile.name) ? (
                isPdfFile(activeFile.name) ? (
                  <PdfViewer
                    key={activeFileId}
                    filePath={activeFile.id}
                    fileName={activeFile.name}
                  />
                ) : (
                <div className="editor-container">
                  <div className="empty-state fade-in">
                    <div className="empty-state-icon">📦</div>
                    <p className="empty-state-text">
                      <strong>{activeFile.name}</strong>
                    </p>
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                      .{getFileExtension(activeFile.name)} files can't be opened (Unsupported file type)
                    </p>
                  </div>
                </div>
                )
              ) : (
                <EditorComponent
                  key={`${activeFileId}-${reloadNonce}`}
                  content={getEditorContent()}
                  onUpdate={handleEditorUpdate}
                  editorRef={editorRef}
                  onEditorReady={handleEditorReady}
                  onImageFile={handleImageFile}
                />
              )
            ) : (
              <div className="editor-container">
                <div className="empty-state fade-in">
                  <div className="empty-state-icon">📝</div>
                  <p className="empty-state-text">
                    {currentFolder
                      ? 'Select a file or create a new one'
                      : isTauri()
                        ? 'Open a folder (Cmd+Shift+O)'
                        : 'Select a file or create a new one'}
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
                      Open Folder
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {outlineOpen && editorInstance && <Outline editor={editorInstance} />}
        </div>
        <StatusBar
          editor={editorInstance}
          theme={theme}
          onToggleTheme={toggleTheme}
          saveStatus={saveStatus}
        />
      </div>
      <SettingsDialog
        isOpen={settingsOpen}
        settings={settings}
        onSave={handleSaveSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
