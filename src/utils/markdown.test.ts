import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from './markdown';

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
