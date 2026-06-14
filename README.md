# RDM — Reactive Download Manager

A cross-platform Electron + React + TypeScript download manager. Modern clone of Internet Download Manager with plugins, automation, scheduling, browser extensions, grabber, and cloud integration.

## Features

- **Chunked parallel downloads** — up to 32 connections per file, resume support, speed/ETA calculation
- **Queue management** — reorder, concurrency control, global and per-download speed limits
- **Scheduler** — cron-based scheduling with time windows and day-of-week filtering
- **Automation** — rule engine with 10 condition types and 10 action types
- **Browser extensions** — Chrome + Firefox with context menus, popup, one-click "Send to RDM"
- **Floating download button** — injects overlay on video/audio elements in web pages
- **Grabber** — scan websites for video, audio, image, archive, and document links
- **Plugin system** — DB-backed, installable plugins with sandboxed API (downloads, storage, network, events)
- **YouTube extractor plugin** — oEmbed-based video info extraction, format detection
- **Clipboard monitor** — auto-detect copied URLs
- **Native notifications** — OS-level alerts on download complete/error
- **MD5 checksum verification** — automatic on completion
- **Exponential backoff retry** — 2s/4s/8s retry logic
- **Browser bridge** — TCP server on 127.0.0.1:19527 for native messaging

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 33 |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| Build | electron-vite, Vite |
| Packaging | electron-builder (Win/Mac/Linux) |
| Database | SQLite via node:sqlite DatabaseSync |
| State | Zustand |
| Package Manager | pnpm workspaces |

## Getting Started

```bash
# Install dependencies
pnpm install

# Development (requires Electron binary)
pnpm dev

# Production build
pnpm build

# Package for distribution
pnpm package:win     # Windows NSIS installer
pnpm package:mac     # macOS DMG
pnpm package:linux   # Linux AppImage/deb
```

## Project Structure

```
rdm/
├── packages/
│   ├── shared/              Types, constants, IPC channels, utilities
│   ├── main/                Electron main process
│   │   └── src/
│   │       ├── download/    Download engine (chunked HTTP, resume, speed calc)
│   │       ├── ipc/         IPC handlers (download, settings, queue, plugins)
│   │       ├── storage/     SQLite database + migrations
│   │       ├── plugins/     Plugin loader + PluginAPI
│   │       ├── automation/  Automation rule engine
│   │       ├── scheduler/   Cron-based schedule engine
│   │       ├── grabber/     Web media link scraper
│   │       ├── clipboard/   Clipboard URL monitor
│   │       ├── notifications/ Native OS notifications
│   │       └── browser-bridge/ TCP server for browser extensions
│   ├── preload/             Context bridge (window.api)
│   ├── renderer/            React UI
│   │   └── src/
│   │       ├── pages/       Downloads, Completed, Scheduler, Grabber,
│   │       │                Automation, Plugins, Settings
│   │       ├── components/  TitleBar, Sidebar, StatusBar, DownloadItem/List
│   │       └── stores/      Zustand stores (download, UI, settings)
│   └── browser-extensions/  Chrome + Firefox extensions
├── plugins/
│   └── youtube-extractor/   YouTube media extractor plugin
└── resources/
    ├── icons/               App icons
    └── native-messaging/    Native messaging host for browser extensions
```

## Browser Extensions

1. Load `packages/browser-extensions/chrome/` as an unpacked Chrome extension
2. Install the native messaging host (`resources/native-messaging/`) for browser-to-desktop communication
3. Right-click any link, image, or page → "Download with RDM"
4. The floating download button appears on videos/audio on pages

## Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Foundation: monorepo, types, DB, app shell, 3-page UI | ✅ |
| 2 | Core engines: download, automation, scheduler, plugins | ✅ |
| 3 | Queue management, retry, checksums, speed limits | ✅ |
| 5 | Plugin system: UI, install/enable/disable, YouTube extractor | ✅ |
| 6 | Grabber: web media detection, Crawl + Scan | ✅ |
| 7 | Browser extensions: Chrome + Firefox, native messaging | ✅ |
| 8 | Clipboard monitor + native notifications | ✅ |
| 9 | Polish: icons, README, tests | ✅ |
| 10 | Core engine stability fixes: async chunk I/O streaming | ✅ |
| 11 | IDM Style UI Refinements, Dialog boxes & IPC integration | ✅ |
| 4 | Cloud integration (skipped) | — |

## License

MIT
