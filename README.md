<p align="center">
  <img src="src-tauri/icons/icon.png" alt="MD Editor" width="128" height="128">
</p>

<h1 align="center">MD Editor</h1>

<p align="center">
  <strong>A beautiful, fast, and lightweight Markdown editor for macOS, Windows, and Linux</strong>
</p>



---

## ✨ Features

- 📝 **Rich Markdown Editing** — WYSIWYG editor with live formatting (bold, italic, headings, lists, code blocks, tables, and more)
- 🌲 **Nested Folder Tree** — Browse and manage deeply nested directories with collapsible tree view
- ✏️ **Rename & Organize** — Rename files/folders in place, create new folders, or create a file directly inside a chosen folder — all from the row's "⋯" menu
- 🗑️ **Trash, Not Delete** — Deleted files move to a `.trash/` folder next to your vault instead of being removed outright
- 🔍 **Find & Replace** — In-document find/replace (`Cmd/Ctrl+F`), plus search across every file in the open folder from the sidebar
- 🗂️ **Outline / Table of Contents** — Jump between headings in long documents from a collapsible side panel
- 🕘 **Recent Files** — Quickly reopen files you've had open recently
- 🏷️ **Frontmatter** — Optional title/tags/date metadata block, editable from a bar above the editor
- 🖼️ **Real Image Files** — Pasted/dropped images are saved as real files under `assets/` next to your document instead of bloating the `.md` file with base64
- 🔄 **External Change Detection** — Picks up edits made outside the app (another editor, git checkout, sync conflict) when you switch back to MD Editor
- ⚙️ **Settings** — Configure auto-save delay and editor content width
- 📂 **All File Types** — View `.md`, `.txt`, `.html`, `.css`, `.js`, `.py`, and other text files; binary files show a friendly unsupported message
- 🎨 **Dark & Light Themes** — Toggle between elegant dark and light modes
- ⌨️ **Keyboard Shortcuts** — `Cmd/Ctrl+S` save, `Cmd/Ctrl+N` new file, `Cmd/Ctrl+F` find, `Cmd/Ctrl+Shift+O` open folder
- 💾 **Auto-save** — Changes are automatically saved as you type
- 📤 **Export** — Export as `.md` or `.html`
- 🍎 **Universal macOS Binary** — Runs natively on both Apple Silicon (M1/M2/M3) and Intel Macs
- 🪟 **Windows Support** — Available as `.exe` installer for `x64` and `ARM64`
- 🐧 **Linux Support** — Available as `.deb` packages for `amd64` and `arm64` (Kali, Ubuntu, Debian)
- ⚡ **Blazing Fast** — Built with Tauri v2 + Rust backend, app launches in under 1 second
- 🔒 **Privacy First** — All files stay on your machine. No cloud, no telemetry, no tracking

---

## 📦 Installation

### macOS

1. Download the latest `.dmg` from [Releases](https://github.com/KhitMinnyo/md-editor/releases/latest)
2. Open the `.dmg` file
3. Drag **MD Editor** to your **Applications** folder
4. Launch from Applications

> **Note:** If macOS shows "App is damaged", run:
> ```bash
> xattr -cr /Applications/MD\ Editor.app
> ```

### Windows

1. Download the `.exe` installer for your architecture from [Releases](https://github.com/KhitMinnyo/md-editor/releases/latest):
   - `MD Editor_x.x.x_x64-setup.exe` — Intel/AMD 64-bit
   - `MD Editor_x.x.x_arm64-setup.exe` — ARM 64-bit (Snapdragon, etc.)

2. Run the installer and follow the prompts
3. Launch **MD Editor** from the Start Menu

### Linux (Kali / Ubuntu / Debian)

1. Download the `.deb` for your architecture from [Releases](https://github.com/KhitMinnyo/md-editor/releases/latest):
   - `md-editor_x.x.x_amd64.deb` — Intel/AMD 64-bit
   - `md-editor_x.x.x_arm64.deb` — ARM 64-bit (Raspberry Pi, etc.)

2. Install:
   ```bash
   sudo dpkg -i md-editor_*.deb
   sudo apt-get install -f  # Install any missing dependencies
   ```

3. Launch:
   ```bash
   md-editor
   ```

---

## ☁️ Cloud Sync (Optional)

MD Editor works with **any cloud storage** — just point it to your synced folder:

| Service | How to Sync |
|---|---|
| **iCloud Drive** | Open folder at `~/Library/Mobile Documents/com~apple~CloudDocs/Notes` |
| **Google Drive** | Install [Google Drive Desktop](https://www.google.com/drive/download/), open folder at `~/Google Drive/My Drive/Notes` |
| **Dropbox** | Open folder at `~/Dropbox/Notes` |
| **OneDrive** | Open folder at `~/OneDrive/Notes` |

Your notes will automatically sync across all your devices. No additional setup needed.

---

## 🔒 File System Access

MD Editor requests broad file system permissions (`src-tauri/capabilities/default.json` grants read/write/delete across `**`, i.e. the whole disk, not just a sandboxed app folder). This is intentional: the app is a general-purpose folder browser/editor — you can point it at any folder on disk (including cloud-synced ones), and it needs to read, write, and delete files anywhere you choose to open. Tauri's dialog-triggered folder/file pickers are still the only way a folder is *added* to the app; MD Editor never reads or writes outside a folder you've explicitly opened.

If you're building a fork that only needs to touch a fixed directory (e.g. `$APPDATA`), narrow the `path` scopes in `src-tauri/capabilities/default.json` accordingly — see the [Tauri capabilities docs](https://v2.tauri.app/security/capabilities/).

---

## 🔄 Auto-Update Setup (scaffolded, not fully wired yet)

The `@tauri-apps/plugin-updater` / `tauri-plugin-updater` dependencies are installed and registered (see `src-tauri/src/lib.rs`), and `Settings → Check for Updates` calls into them — but the actual update *channel* (signing keypair + release endpoint) isn't configured yet, since generating a real keypair needs to happen on a machine with network access. Until it is, "Check for Updates" reports that auto-update isn't fully configured rather than erroring.

To finish wiring it up:

1. Generate a signing keypair: `npx tauri signer generate -w ~/.tauri/md-editor.key` (do this once, keep the private key safe).
2. Add a `plugins.updater` block to `src-tauri/tauri.conf.json` with the printed public key and a release endpoint, e.g.:
   ```json
   "plugins": {
     "updater": {
       "pubkey": "<paste the public key here>",
       "endpoints": [
         "https://github.com/KhitMinnyo/md-editor/releases/latest/download/latest.json"
       ]
     }
   }
   ```
3. In the GitHub repo's **Settings → Secrets and variables → Actions**, add:
   - `TAURI_SIGNING_PRIVATE_KEY` — contents of the private key file generated in step 1
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password you set for it (if any)
4. The three build workflows (`build-macos.yml`, `build-windows.yml`, `build-linux.yml`) already pass these through as env vars to `tauri build`, and are inert (build unsigned, as today) if the secrets aren't set — so this is safe to leave undone until you're ready.
5. You'll also need a small workflow step (or a separate job) that generates and uploads a `latest.json` manifest alongside each release — `tauri build` emits per-target update artifacts once signing is configured; see [Tauri's updater CI docs](https://v2.tauri.app/plugin/updater/#build-and-release) for the exact manifest format GitHub Releases needs.

## 🍎 macOS Codesigning & Notarization (scaffolded, not fully wired yet)

`build-macos.yml` already passes through the standard Apple codesigning env vars to `tauri build` (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) — `tauri build` signs and notarizes automatically when they're present, and just produces an unsigned build (today's behavior, requiring the `xattr -cr` workaround) when they're empty.

This requires an **Apple Developer Program membership** (paid, $99/year) that only you can set up. Once you have one:

1. Create a "Developer ID Application" certificate in your Apple Developer account and export it as a `.p12` file.
2. Add these secrets in GitHub repo **Settings → Secrets and variables → Actions**:
   - `APPLE_CERTIFICATE` — the `.p12` file, base64-encoded (`base64 -i cert.p12 | pbcopy`)
   - `APPLE_CERTIFICATE_PASSWORD` — the password you set when exporting the `.p12`
   - `APPLE_SIGNING_IDENTITY` — e.g. `Developer ID Application: Your Name (TEAMID)`
   - `APPLE_ID` — your Apple ID email
   - `APPLE_PASSWORD` — an [app-specific password](https://support.apple.com/en-us/102654) for that Apple ID (not your normal password)
   - `APPLE_TEAM_ID` — your 10-character Apple Developer Team ID
3. Push a `v*` tag — the existing workflow does the rest.

See [Tauri's macOS codesigning docs](https://v2.tauri.app/distribute/sign/macos/) for the full walkthrough.

---

## 🛠️ Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (latest stable)
- **macOS:** Xcode Command Line Tools (`xcode-select --install`)
- **Linux:** System dependencies:
  ```bash
  sudo apt-get install -y \
    libwebkit2gtk-4.1-dev libgtk-3-dev \
    libayatana-appindicator3-dev librsvg2-dev \
    patchelf build-essential
  ```

### Build

```bash
# Clone the repo
git clone https://github.com/KhitMinnyo/md-editor.git
cd md-editor

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Build Targets

```bash
# macOS Universal (Intel + Apple Silicon)
npx tauri build --target universal-apple-darwin

# Windows x64
npx tauri build --bundles nsis --target x86_64-pc-windows-msvc

# Windows ARM64 (cross-compile from x64)
npx tauri build --bundles nsis --target aarch64-pc-windows-msvc

# Linux (on native machine)
npx tauri build --bundles deb
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + N` | New file |
| `Cmd/Ctrl + F` | Find (in document) |
| `Cmd/Ctrl + Shift + O` | Open folder |
| `Cmd/Ctrl + B` | Bold |
| `Cmd/Ctrl + I` | Italic |
| `Cmd/Ctrl + U` | Underline |
| `Cmd/Ctrl + Shift + X` | Strikethrough |
| `Cmd/Ctrl + E` | Code |
| `Cmd/Ctrl + Shift + H` | Highlight |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Tauri v2](https://v2.tauri.app/) |
| **Backend** | Rust |
| **Frontend** | React + TypeScript |
| **Editor** | [TipTap](https://tiptap.dev/) |
| **Bundler** | Vite |
| **Styling** | Vanilla CSS |
| **CI/CD** | GitHub Actions |

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/KhitMinnyo">Khit Minnyo</a>
</p>
