import type { SearchMatch } from '../../utils/fileManager';

// ─── Search Results ──────────────────────────────────────
export function SearchResults({
  matches,
  loading,
  onSelect,
}: {
  matches: SearchMatch[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return <div className="empty-state"><span className="empty-state-text">Searching...</span></div>;
  }
  if (matches.length === 0) {
    return <div className="empty-state"><span className="empty-state-text">No results found</span></div>;
  }
  return (
    <>
      {matches.map((m, i) => (
        <div
          key={`${m.fileId}-${m.lineNumber}-${i}`}
          className="search-result-item"
          onClick={() => onSelect(m.fileId)}
        >
          <div className="search-result-file">{m.fileName}<span className="search-result-line">:{m.lineNumber}</span></div>
          <div className="search-result-snippet">{m.snippet}</div>
        </div>
      ))}
    </>
  );
}
