import { useState } from 'react';
import { Editor } from '@tiptap/core';
import LinkDialog from './LinkDialog';
import TableDialog from './TableDialog';
import TableToolbar from './TableToolbar';
import HeadingSelect from './toolbar/HeadingSelect';
import FormattingGroup from './toolbar/FormattingGroup';
import ListGroup from './toolbar/ListGroup';
import AlignmentGroup from './toolbar/AlignmentGroup';
import InsertGroup from './toolbar/InsertGroup';
import HistoryGroup from './toolbar/HistoryGroup';
import FindOutlineGroup from './toolbar/FindOutlineGroup';
import ExportGroup from './toolbar/ExportGroup';

interface ToolbarProps {
  editor: Editor | null;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
  onImportFile: () => void;
  onToggleFind: () => void;
  onToggleOutline: () => void;
  outlineOpen: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  onExportMarkdown,
  onExportHtml,
  onImportFile,
  onToggleFind,
  onToggleOutline,
  outlineOpen,
}) => {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const handleLink = () => {
    if (!editor) return;

    // If already on a link, unset it
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    // Get selected text for the dialog
    const { from, to } = editor.state.selection;
    const selected = from !== to ? editor.state.doc.textBetween(from, to) : '';
    setSelectedText(selected);
    setLinkDialogOpen(true);
  };

  const handleLinkSubmit = (url: string, text: string) => {
    if (!editor) return;
    setLinkDialogOpen(false);

    const displayText = text || url;
    const { from, to } = editor.state.selection;

    if (from === to || !text) {
      // No selection or custom text — insert new link text
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${displayText}</a>`)
        .run();
    } else {
      // Text is selected — wrap it with the link
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleImage = () => {
    if (!editor) return;
    // Use a hidden file input instead of window.prompt
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          editor.chain().focus().setImage({ src: base64 }).run();
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  if (!editor) {
    // No active editor yet (initial load, or a non-editable file like a
    // PDF is open) — show branding instead of an empty bar, so the
    // toolbar row never visually collapses.
    return (
      <div className="toolbar toolbar-brand">
        <img src="/favicon.svg" alt="" className="toolbar-brand-icon" />
        <span className="toolbar-brand-name">MD Editor</span>
        <span className="toolbar-brand-version">v{__APP_VERSION__}</span>
      </div>
    );
  }

  return (
    <>
    <div className="toolbar">
      <HeadingSelect editor={editor} />

      <div className="toolbar-divider" />

      <FormattingGroup editor={editor} />

      <div className="toolbar-divider" />

      <ListGroup editor={editor} />

      <div className="toolbar-divider" />

      <AlignmentGroup editor={editor} />

      <div className="toolbar-divider" />

      <InsertGroup
        editor={editor}
        onLinkClick={handleLink}
        onImageClick={handleImage}
        onTableClick={() => setTableDialogOpen(true)}
      />

      <div className="toolbar-divider" />

      <HistoryGroup editor={editor} />

      <div className="toolbar-divider" />

      <FindOutlineGroup
        onToggleFind={onToggleFind}
        outlineOpen={outlineOpen}
        onToggleOutline={onToggleOutline}
      />

      <ExportGroup
        onImportFile={onImportFile}
        onExportMarkdown={onExportMarkdown}
        onExportHtml={onExportHtml}
      />
    </div>

    <TableToolbar editor={editor} />

    <LinkDialog
      isOpen={linkDialogOpen}
      initialText={selectedText}
      onSubmit={handleLinkSubmit}
      onClose={() => setLinkDialogOpen(false)}
    />
    <TableDialog
      isOpen={tableDialogOpen}
      onSubmit={(rows, cols) => {
        setTableDialogOpen(false);
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      }}
      onClose={() => setTableDialogOpen(false)}
    />
    </>
  );
};

export default Toolbar;
