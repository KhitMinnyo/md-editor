import type { Editor } from '@tiptap/core';

// Group 1 — Heading Select
export default function HeadingSelect({ editor }: { editor: Editor }) {
  const getCurrentHeading = (): string => {
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level: level as 1 | 2 | 3 | 4 | 5 | 6 })) return String(level);
    }
    return '0';
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '0') {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(value, 10) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  return (
    <div className="toolbar-group">
      <select
        className="toolbar-select"
        value={getCurrentHeading()}
        onChange={handleHeadingChange}
      >
        <option value="0">Normal</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
        <option value="4">H4</option>
        <option value="5">H5</option>
        <option value="6">H6</option>
      </select>
    </div>
  );
}
