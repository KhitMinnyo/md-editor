import { describe, it, expect } from 'vitest';
import {
  getFileExtension,
  isMarkdownFile,
  isTextFile,
  isBinaryFile,
  isPdfFile,
  isTauri,
} from './fileManager';

describe('getFileExtension', () => {
  it('returns the lowercased extension', () => {
    expect(getFileExtension('Notes.MD')).toBe('md');
    expect(getFileExtension('script.TS')).toBe('ts');
  });

  it('returns an empty string when there is no extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
    expect(getFileExtension('README')).toBe('');
  });

  it('uses the last dot for multi-dot filenames', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });
});

describe('isMarkdownFile', () => {
  it('recognizes markdown-family extensions', () => {
    expect(isMarkdownFile('a.md')).toBe(true);
    expect(isMarkdownFile('a.markdown')).toBe(true);
    expect(isMarkdownFile('a.mdx')).toBe(true);
    expect(isMarkdownFile('a.mdown')).toBe(true);
  });

  it('rejects non-markdown extensions', () => {
    expect(isMarkdownFile('a.txt')).toBe(false);
    expect(isMarkdownFile('a.markdownx')).toBe(false);
  });
});

describe('isTextFile', () => {
  it('recognizes known text/code extensions', () => {
    expect(isTextFile('notes.txt')).toBe(true);
    expect(isTextFile('index.html')).toBe(true);
    expect(isTextFile('main.rs')).toBe(true);
    expect(isTextFile('readme.md')).toBe(true);
  });

  it('rejects unknown/binary extensions', () => {
    expect(isTextFile('photo.png')).toBe(false);
    expect(isTextFile('archive.zip')).toBe(false);
  });
});

describe('isBinaryFile', () => {
  it('treats known text and markdown extensions as non-binary', () => {
    expect(isBinaryFile('notes.txt')).toBe(false);
    expect(isBinaryFile('notes.md')).toBe(false);
  });

  it('treats unknown extensions as binary', () => {
    expect(isBinaryFile('photo.png')).toBe(true);
    expect(isBinaryFile('doc.pdf')).toBe(true);
  });

  it('treats extension-less files as non-binary (no extension to judge by)', () => {
    expect(isBinaryFile('Makefile')).toBe(false);
  });
});

describe('isPdfFile', () => {
  it('matches only .pdf', () => {
    expect(isPdfFile('report.pdf')).toBe(true);
    expect(isPdfFile('report.PDF')).toBe(true);
    expect(isPdfFile('report.txt')).toBe(false);
  });
});

describe('isTauri', () => {
  it('is false in a plain browser/test environment (no __TAURI_INTERNALS__)', () => {
    expect(isTauri()).toBe(false);
  });
});
