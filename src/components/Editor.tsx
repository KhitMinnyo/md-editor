import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Editor } from '@tiptap/core';
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
}

export default function EditorComponent({ content, onUpdate, editorRef, onEditorReady }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image.configure({
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
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              if (base64 && view.state) {
                const { schema } = view.state;
                const imageNode = schema.nodes.image?.create({ src: base64 });
                if (imageNode) {
                  const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  if (pos) {
                    const tr = view.state.tr.insert(pos.pos, imageNode);
                    view.dispatch(tr);
                  }
                }
              }
            };
            reader.readAsDataURL(file);
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
