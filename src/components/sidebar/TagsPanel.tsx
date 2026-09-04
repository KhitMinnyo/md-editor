import type { TagIndexEntry } from '../../utils/markdown';

// ─── Tags Panel ────────────────────────────────────────
// Browse files by frontmatter `tags:` — a tag cloud that drills into a
// date-sorted file list, so the Title/Tags/Date metadata bar is actually
// useful for something inside the app, not just stored inertly in the file.
export function TagsPanel({
  tagIndex,
  loading,
  selectedTag,
  onSelectTag,
  onBack,
  onSelectFile,
}: {
  tagIndex: TagIndexEntry[];
  loading: boolean;
  selectedTag: string | null;
  onSelectTag: (tag: string) => void;
  onBack: () => void;
  onSelectFile: (id: string) => void;
}) {
  if (loading) {
    return <div className="empty-state"><span className="empty-state-text">Scanning tags...</span></div>;
  }

  if (!selectedTag) {
    if (tagIndex.length === 0) {
      return (
        <div className="empty-state">
          <span className="empty-state-text">
            No tags yet. Add a <code>Tags</code> field in the metadata bar above the editor.
          </span>
        </div>
      );
    }
    return (
      <div className="tag-list">
        {tagIndex.map(({ tag, files }) => (
          <button key={tag} className="tag-pill" onClick={() => onSelectTag(tag)}>
            {tag}
            <span className="tag-pill-count">{files.length}</span>
          </button>
        ))}
      </div>
    );
  }

  const entry = tagIndex.find((t) => t.tag === selectedTag);
  return (
    <>
      <button className="tag-back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All tags
      </button>
      {(entry?.files ?? []).map((f) => (
        <div key={f.fileId} className="search-result-item" onClick={() => onSelectFile(f.fileId)}>
          <div className="search-result-file">{f.title || f.fileName}</div>
          {f.date && <div className="tag-file-date">{f.date}</div>}
        </div>
      ))}
    </>
  );
}
