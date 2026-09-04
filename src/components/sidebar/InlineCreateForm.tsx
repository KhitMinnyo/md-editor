import { useState, useRef, useEffect } from 'react';

// ─── Inline create form (used at root and inside a folder) ──
export function InlineCreateForm({
  mode,
  onSubmit,
  onCancel,
  depth = 0,
}: {
  mode: 'file' | 'folder';
  onSubmit: (name: string) => void;
  onCancel: () => void;
  depth?: number;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <div className="new-file-form" style={{ paddingLeft: `${12 + depth * 16}px` }}>
      <input
        ref={inputRef}
        className="new-file-input"
        type="text"
        placeholder={mode === 'folder' ? 'Folder name...' : 'File name...'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        onBlur={submit}
      />
    </div>
  );
}
