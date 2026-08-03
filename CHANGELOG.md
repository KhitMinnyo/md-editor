# Changelog

All notable changes to MD Editor are documented in this file.

## [Unreleased]

### Fixed
- Removed duplicate files that had accidentally been committed to the repo
  (`src 2/`, `index 2.html`, `LICENSE 2`, `eslint.config 2.js`, `icon 2.png`,
  `public 2/`, `package-lock 2.json`).
- Pending debounced edits are now flushed to disk when the window/app is
  closed, instead of being lost if you quit within ~600ms of your last
  keystroke.

### Added
- macOS CI workflow (`.github/workflows/build-macos.yml`) producing a
  universal `.dmg`, matching the Linux and Windows build workflows.
- Unit tests (Vitest) for `src/utils/markdown.ts` and `src/utils/fileManager.ts`.

### Docs
- Documented why `src-tauri/capabilities/default.json` grants filesystem
  access across the whole disk (README, "File System Access" section).

## [0.1.1] - 2026-06-04

- Cross-platform packaging: Windows `.exe` (x64/ARM64) and Linux `.deb`
  (amd64/arm64) build workflows.
- Various Linux/Windows build fixes (lib.rs, CI workflows, dependency
  installation).
- New features and general updates.

## [0.1.0] - 2026-06-04

- Initial release: Tauri v2 + React + TipTap WYSIWYG Markdown editor with
  Myanmar Unicode support, nested folder tree, dark/light themes, and
  Markdown/HTML export.
