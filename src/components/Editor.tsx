import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

// Extends the stock Image extension with a `data-relative-src` attribute.
// When a pasted/dropped image is saved to disk as a real file (see
// onImageFile below), the <img> shown in the editor points at a
// webview-loadable asset:// URL, but what we actually want to write back
// into the .md file is the *relative* path (portable, git-friendly). This
// attribute carries that relative path through TipTap's HTML
// serialization so the custom turndown image rule (markdown.ts) can use
// it instead of the asset:// URL.
const ImageWithRelativeSrc = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-relative-src': {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-relative-src'),
        renderHTML: (attributes: Record<string, unknown>) => {
          const value = attributes['data-relative-src'];
          if (!value) return {};
          return { 'data-relative-src': value };
        },
      },
    };
  },
});

export interface SavedImage {
  /** URL to display in the editor (e.g. a converted asset:// URL, or a data URL). */
  src: string;
  /** Portable relative path to write into the markdown file, if any. */
  relativeSrc?: string;
}

interface EditorProps {
  content: string;
  onUpdate: (html: string) => void;
  editorRef?: React.MutableRefObject<Editor | null>;
  // Called with the editor instance once it's ready (and with null on
  // unmount). Unlike editorRef, this drives React state in the parent —
  // mutating a ref alone doesn't trigger a re-render, which used to leave
  // the Toolbar/StatusBar stuck showing their "no editor yet" state until
  // some unrelated re-render happened to pick up the ref's new value.
  onEditorReady?: (editor: Editor | null) => void;
  // Save a pasted/dropped image file to disk instead of inlining it as
  // base64. Return null (or leave unset) to fall back to base64 embedding.
  onImageFile?: (file: File) => Promise<SavedImage | null>;
}

export default function EditorComponent({ content, onUpdate, editorRef, onEditorReady, onImageFile }: EditorProps) {
  const insertImageFile = async (view: EditorView, file: File) => {
    if (onImageFile) {
      try {
        const saved = await onImageFile(file);
        if (saved) {
          const { schema } = view.state;
          const imageNode = schema.nodes.image?.create({
            src: saved.src,
            'data-relative-src': saved.relativeSrc ?? null,
          });
          if (imageNode) {
            const tr = view.state.tr.replaceSelectionWith(imageNode);
            view.dispatch(tr);
          }
          return;
        }
      } catch (err) {
        console.error('Failed to save pasted image as a file, embedding it instead:', err);
      }
    }

    // Fallback: embed as base64 (browser dev mode, or the file save failed).
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64 && view.state) {
        const { schema } = view.state;
        const imageNode = schema.nodes.image?.create({ src: base64 });
        if (imageNode) {
          const tr = view.state.tr.replaceSelectionWith(imageNode);
          view.dispatch(tr);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      ImageWithRelativeSrc.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: 'စာရေးရန် ဒီနေရာမှာ စတင်ပါ...',
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Typography,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getHTML());
    },
    // Handle clipboard paste & drag-drop for images
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            void insertImageFile(view, file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            void insertImageFile(view, file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // NO content sync useEffect here!
  // The key={activeFileId} in App.tsx remounts this component on file switch,
  // so the `content` prop is only used as initial content. During editing,
  // TipTap manages its own internal state. Re-syncing content from props
  // during editing causes a destructive loop that kills tables/links/images.

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
    onEditorReady?.(editor);

    return () => {
      if (editorRef) {
        editorRef.current = null;
      }
      onEditorReady?.(null);
    };
  }, [editor, editorRef, onEditorReady]);

  if (!editor) {
    return (
      <div className="editor-container">
        <div className="editor-wrapper">
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
