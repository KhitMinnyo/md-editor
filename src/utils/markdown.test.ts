import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown, serializeEditorContentForSave, type SaveTextSource } from './markdown';

describe('markdownToHtml', () => {
  it('renders basic formatting', () => {
    const html = markdownToHtml('# Hello\n\n**bold** and *italic*');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders GFM features (gfm: true)', () => {
    const html = markdownToHtml('- [ ] todo\n- [x] done');
    expect(html).toContain('checkbox');
  });

  it('turns single newlines into <br> (breaks: true)', () => {
    const html = markdownToHtml('line one\nline two');
    expect(html).toContain('<br>');
  });
});

describe('htmlToMarkdown', () => {
  it('converts basic formatting back to markdown', () => {
    const md = htmlToMarkdown('<h1>Hello</h1><p><strong>bold</strong></p>');
    expect(md).toContain('# Hello');
    expect(md).toContain('**bold**');
  });

  it('preserves tables as raw HTML tags (custom turndown rules)', () => {
    const html =
      '<table><thead><tr><th>A</th><th>B</th></tr></thead>' +
      '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('<table>');
    expect(md).toContain('<thead>');
    expect(md).toContain('<tr>');
    expect(md).toContain('<th>A</th>');
    expect(md).toContain('<td>1</td>');
  });
});

describe('markdown <-> html round trip', () => {
  it('survives a simple document round trip', () => {
    const original = '# Title\n\nSome **bold** text with a [link](https://example.com).';
    const html = markdownToHtml(original);
    const back = htmlToMarkdown(html);
    expect(back).toContain('# Title');
    expect(back).toContain('**bold**');
    expect(back).toContain('[link](https://example.com)');
  });

  it('preserves a table through a full markdown -> html -> markdown round trip', () => {
    const html = markdownToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |\n');
    const back = htmlToMarkdown(html);
    // Table survives as raw HTML (see custom turndown table rules), not GFM pipes,
    // and the cell content isn't dropped. Cell attributes aren't asserted since
    // marked's exact output (e.g. alignment attrs) isn't part of this contract.
    expect(back).toContain('<table>');
    expect(back).toMatch(/<td[^>]*>\s*1\s*<\/td>/);
    expect(back).toMatch(/<td[^>]*>\s*2\s*<\/td>/);
  });
});

describe('serializeEditorContentForSave', () => {
  // Regression test: opening a non-markdown text file (.js/.py/.css/...)
  // renders it as a single <pre><code> block (see App.tsx's
  // getEditorContent), and editing + saving it used to run that HTML
  // through htmlToMarkdown unconditionally — which wraps <pre><code> in a
  // fenced code block and corrupts the file on every save. This pins the
  // fix: non-markdown files must be saved as plain text, never fenced
  // markdown, regardless of what the HTML looks like.
  it('saves a non-markdown file as plain text, not a fenced code block', () => {
    const code = 'function hello() {\n  console.log("hi");\n}';
    const editor: SaveTextSource = {
      getHTML: () => `<pre><code class="language-js">${code}</code></pre>`,
      getText: () => code,
    };
    const saved = serializeEditorContentForSave('script.js', editor, null);
    expect(saved).toBe(code);
    expect(saved).not.toContain('```');
  });

  it('uses getText (not getHTML/turndown) for any non-markdown extension', () => {
    const text = 'body { color: red; }';
    const editor: SaveTextSource = {
      getHTML: () => `<pre><code class="language-css">${text}</code></pre>`,
      getText: () => text,
    };
    expect(serializeEditorContentForSave('styles.css', editor, null)).toBe(text);
    expect(serializeEditorContentForSave('notes.txt', editor, null)).toBe(text);
    expect(serializeEditorContentForSave('README', editor, null)).toBe(text);
  });

  it('still converts markdown files through htmlToMarkdown + frontmatter', () => {
    const editor: SaveTextSource = {
      getHTML: () => '<h1>Title</h1><p><strong>bold</strong></p>',
      getText: () => 'Title\nbold', // should be ignored for .md files
    };
    const saved = serializeEditorContentForSave('notes.md', editor, { title: 'Notes' });
    expect(saved).toContain('---');
    expect(saved).toContain('title: Notes');
    expect(saved).toContain('# Title');
    expect(saved).toContain('**bold**');
    expect(saved).not.toBe('Title\nbold');
  });

  it('is case-insensitive and handles markdown-family extensions (.markdown/.mdx/.mdown)', () => {
    // getHTML() and getText() deliberately return different values, so a
    // wrong branch (or a case-sensitivity bug) shows up as the wrong text.
    const editor: SaveTextSource = {
      getHTML: () => '<p>from html</p>',
      getText: () => 'from text',
    };
    for (const name of ['notes.MD', 'notes.markdown', 'notes.mdx', 'notes.mdown']) {
      expect(serializeEditorContentForSave(name, editor, null)).toBe('from html');
    }
    for (const name of ['script.JS', 'archive.tar.gz', 'README']) {
      expect(serializeEditorContentForSave(name, editor, null)).toBe('from text');
    }
  });
});
