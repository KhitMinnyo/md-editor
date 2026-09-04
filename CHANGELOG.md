# Changelog

All notable changes to MD Editor are documented in this file.

## [Unreleased]

### Added
- Sidebar "Browse by tag" panel: reads the `Tags`/`Date`/`Title` frontmatter
  fields from every Markdown file in the open folder and lets you drill
  from a tag cloud into a date-sorted file list.
- CI workflow (`.github/workflows/ci.yml`): runs `npm run lint`, `tsc -b
  --noEmit`, and `npm test` on every push/PR to `main`, so lint/type/test
  regressions are now caught automatically instead of only on the next
  platform build.

### Fixed
- **Data loss**: opening any non-Markdown text file (`.js`, `.py`, `.css`,
  `.txt`, etc — the "view/edit other text files" feature) and letting it
  autosave, or pressing Cmd/Ctrl+S, wrapped the file's entire contents in
  a Markdown fenced code block (` ```lang ... ``` `) on save, corrupting
  it. The save path ran every file through the Markdown (turndown)
  converter unconditionally; it now only does that for actual Markdown
  files and pulls plain text straight from the editor for everything
  else. See `serializeEditorContentForSave` in `src/utils/markdown.ts`,
  covered by new regression tests in `markdown.test.ts`.
- `index.html` was corrupted with a literal ` ```html ` code-fence wrapper,
  which leaked as visible text at the top of the window on load — the
  root cause of the original toolbar-area display bug.
- Window could get permanently stuck unclosable if the pending-save flush
  on window close threw an error (no try/finally around `destroy()`).
- Sidebar/Toolbar branding now shows the real app logo (`favicon.svg`)
  instead of a generic icon.

### Changed
- All UI text (menus, buttons, dialogs, placeholders, welcome content)
  translated from Burmese to English so the app is usable without
  knowing Myanmar. Myanmar Unicode content typing/rendering is unaffected.
- Internal refactor: `Sidebar.tsx` (972 lines) and `Toolbar.tsx` (507
  lines) were split into focused sub-components under
  `src/components/sidebar/` and `src/components/toolbar/` (tree view,
  recent files, search results, tags panel; heading select, formatting/
  list/alignment/insert/history groups, find & outline, export). No
  behavior change — same props, same rendered output.
- Fixed all 16 `npm run lint` errors (`react-hooks/set-state-in-effect`,
  `react-hooks/refs`, `react-hooks/preserve-manual-memoization`), plus
  `eslint.config.js` no longer lints `src-tauri/target` (Rust build
  output was being parsed as JS). `npm run lint` and `tsc -b --noEmit`
  are both clean again. Fixes reset dialog/panel state on open/switch via
  React's documented render-time pattern instead of an effect+setState,
  use `useSyncExternalStore` for the Outline panel's live heading list,
  and wrap unavoidable async-effect state updates in the fewest cases
  where that's the right tool. One small, deliberate behavior change:
  the sidebar search "Searching…" indicator now appears once the 300ms
  debounce fires rather than on every keystroke.

### Removed
- Auto-update scaffolding (`tauri-plugin-updater`, `tauri-plugin-process`,
  `Settings → Check for Updates`). It was never fully wired up (no signing
  key configured in `tauri.conf.json`), and registering the updater plugin
  without a `plugins.updater` config block is a plausible cause of the app
  failing to launch on some machines. Removed rather than fixed further,
  since it wasn't functional anyway.

## [0.1.2] - 2026-08-03

### Added
- Rename files/folders, create folders, and create a file/folder inside a
  specific subfolder, from a new per-row "⋯" menu in the sidebar.
- Deletes move to a `.trash/` folder next to the vault instead of being
  removed outright.
- Recent-files list above the file tree.
- In-document find & replace (`Cmd/Ctrl+F`).
- Search across every text/markdown file in the open folder, from the
  sidebar.
- Table of contents / outline side panel, derived from document headings.
- Frontmatter (flat `title`/`tags`/`date` block), editable from a bar
  above the editor.
- Pasted/dropped images are saved as real files under `assets/` next to
  the document instead of being inlined as base64.
- Detects edits made to the active file from outside the app (another
  editor, git checkout, sync conflict) and reloads them on window focus
  when there's no unsaved local edit.
- Settings dialog: auto-save delay, editor content width, manual update
  check.
- Auto-update and macOS notarization *scaffolding* (dependencies, Rust
  plugin registration, CI secret passthrough) — not fully wired up yet;
  see README's "Auto-Update Setup" / "macOS Codesigning & Notarization"
  sections for the remaining manual steps.
- macOS CI workflow (`.github/workflows/build-macos.yml`) producing a
  universal `.dmg`, matching the Linux and Windows build workflows.
- Unit tests (Vitest) for `src/utils/markdown.ts` and `src/utils/fileManager.ts`.

### Fixed
- Removed duplicate files that had accidentally been committed to the repo
  (`src 2/`, `index 2.html`, `LICENSE 2`, `eslint.config 2.js`, `icon 2.png`,
  `public 2/`, `package-lock 2.json`).
- Pending debounced edits are now flushed to disk when the window/app is
  closed, instead of being lost if you quit within ~600ms of your last
  keystroke.
- Toolbar could get stuck showing its empty/no-editor state on load
  (mutating a ref doesn't trigger a re-render) — now driven by real React
  state instead, and shows an "MD Editor vX.Y.Z" placeholder rather than
  collapsing when there's no active editor.

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
