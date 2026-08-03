import type { Frontmatter } from '../utils/markdown';

interface MetadataBarProps {
  frontmatter: Frontmatter;
  onChange: (next: Frontmatter) => void;
}

// A deliberately small, fixed set of common fields rather than a free-form
// key editor — keeps the UI simple. Anything else already present in a
// file's frontmatter block (from files edited outside this app) is
// preserved on save even though it isn't shown here.
const FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'title', label: 'ခေါင်းစဉ်', placeholder: 'Title' },
  { key: 'tags', label: 'Tags', placeholder: 'tag1, tag2' },
  { key: 'date', label: 'Date', placeholder: 'YYYY-MM-DD' },
];

export default function MetadataBar({ frontmatter, onChange }: MetadataBarProps) {
  return (
    <div className="metadata-bar">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div className="metadata-field" key={key}>
          <label>{label}</label>
          <input
            type="text"
            placeholder={placeholder}
            value={frontmatter[key] ?? ''}
            onChange={(e) => onChange({ ...frontmatter, [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
