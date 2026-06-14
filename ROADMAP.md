# RDM — Reactive Download Manager

A modern Electron + React + TypeScript download manager (IDM clone) with cloud integration, browser extensions, grabber, plugins, scheduling, and automation.

## Architecture

```
rdm/
├── packages/
│   ├── shared/          @rdm/shared    — Types, constants, IPC channels, utilities
│   ├── main/            @rdm/main      — Electron main process (engines, storage, IPC)
│   ├── preload/         @rdm/preload   — Context bridge (window.api)
│   ├── renderer/        @rdm/renderer  — React UI (pages, components, stores)
│   └── browser-extensions/
│       ├── chrome/
│       └── firefox/
├── plugins/
│   └── youtube-extractor/
└── resources/
    ├── icons/
    └── native-messaging/
```

## Tech Stack

- Electron + React + TypeScript + Node.js
- pnpm workspaces (monorepo)
- electron-vite (build), electron-builder (packaging)
- SQLite via node:sqlite DatabaseSync
- Zustand (state), Tailwind CSS (styles)
- Vitest (testing)

---

## Phase Plan

### ✅ Phase 1: Foundation
**Status: Committed** (`6fef0c9`)

- Monorepo scaffold with pnpm workspaces
- Shared type system: Download, Plugin, Automation, Cloud, Schedule, Settings, IPC channels
- Database schema: downloads, chunks, categories, schedules, automation_rules, cloud_providers, plugins, settings
- App shell: frameless window, system tray, custom title bar, status bar
- 3-page React UI: Downloads, Completed, Settings (6-tabbed)
- IPC channel definitions (all channels for all phases)
- Preload bridge (contextBridge + ipcRenderer)
- Tailwind CSS, Zustand stores (download, UI, settings)
- Build system: electron-vite (main/preload/renderer), electron-builder

### ✅ Phase 2: Core Engines
**Status: Committed** (`bcd6589`)

- `main/download/engine.ts` — chunked parallel HTTP/HTTPS downloading, resume, speed calc, ETA, speed limits
- `main/automation/index.ts` — SQLite rule engine (10 condition types, 10 action types)
- `main/scheduler/index.ts` + `cron.ts` — full cron parser, timer-based scheduling
- `main/plugins/loader.ts` — manifest scanning, sandboxed PluginAPI, load/unload lifecycle
- `renderer/pages/AutomationPage.tsx` — rule CRUD UI with quick templates
- `renderer/pages/SchedulerPage.tsx` — schedule CRUD UI with cron input, time windows
- Wiring: IPC handlers, preload bridge, routing, sidebar nav items

### ✅ Phase 3: Queue Management & Advanced Downloads
**Status: Committed** (`4169a28`)

- Queue reorder (move up/down) — IPC channel: `QUEUE_REORDER`
- Concurrency control (live from settings) — IPC channel: `QUEUE_SET_CONCURRENCY`
- Global speed limits with per-task enforcement — IPC channel: `QUEUE_SET_GLOBAL_SPEED_LIMIT`
- Per-download speed limit and connection count settings (inline gear icon)
- MD5 checksum verification on download completion
- Exponential backoff retry (2s/4s/8s) up to maxRetries
- Live StatusBar stats via QUEUE_STATUS event stream (activeCount, maxConcurrent, totalSpeed, globalSpeedLimit)
- Engine loads concurrency and speed limit from DB on startup
- Add URL dialog: MD5 checksum field

### 📋 Phase 4: Cloud Integration

- Provider implementations: Google Drive, Dropbox, OneDrive
- OAuth connect/disconnect flow
- Auto-upload completed downloads to cloud
- Cloud sync folder monitoring
- Cloud provider settings UI
- IPC channels: `CLOUD_GET_PROVIDERS`, `CLOUD_CONNECT`, `CLOUD_DISCONNECT`, `CLOUD_UPLOAD`

### ✅ Phase 5: Plugin System
**Status: Committed** (`ed34f2c`)

- Plugin management UI page with enable/disable toggle, uninstall, permissions display
- Bundled plugin quick-install section (YouTube Extractor)
- DB-backed plugin state: install/uninstall/enable/disable persisted in SQLite
- Plugin API: real downloads engine integration via dynamic imports, persistent storage per-plugin, full event bus, network.fetch
- YouTube extractor plugin: manifest + oEmbed-based video info extraction, format listing, sanitized filenames
- IPC channels: `PLUGIN_GET_ALL`, `PLUGIN_INSTALL`, `PLUGIN_UNINSTALL`, `PLUGIN_ENABLE`, `PLUGIN_DISABLE`
- Plugins sidebar nav enabled + route

### 📋 Phase 6: Grabber — Web Media Detection

- Video/audio link detection from web pages (YouTube, Vimeo, etc.)
- Site crawling and link extraction
- Type/extension filtering
- Grabber UI page
- Floating "Download this video" button overlay
- IPC channels: `GRABBER_DETECT_VIDEOS`, `GRABBER_CRAWL_SITE`

### 📋 Phase 7: Browser Extensions

- Chrome extension: popup, background service worker, content scripts
- Firefox extension
- Native messaging host bridge (resources/native-messaging/)
- One-click "Send to RDM" from browser context menu
- Download interception via content scripts
- Browser-to-desktop communication via native messaging

### 📋 Phase 8: Clipboard & Notifications

- Clipboard URL monitor — IPC channel: `CLIPBOARD_URL`
- Native OS notifications (Windows/Mac/Linux)
- Download complete/fail alerts
- Auto-paste from clipboard on URL detect
- Notification preferences in Settings

### 📋 Phase 9: Polish & Production

- App icons for all platforms (resources/icons/)
- Full test suite (unit + integration) via Vitest
- Error handling, logging, crash reporting
- Code signing and platform-specific packaging
- README and user documentation
- Final QA pass across all features

---

## Database Schema (7 tables)

| Table | Purpose | Phase Built |
|-------|---------|-------------|
| `downloads` | Active and completed downloads | Phase 1 |
| `chunks` | Per-chunk progress for parallel downloading | Phase 1 |
| `categories` | Download categories (Music, Videos, Documents, Archives, Programs, Other) | Phase 1 |
| `schedules` | Cron-based download schedules | Phase 1 |
| `automation_rules` | Conditional automation (JSON conditions + actions) | Phase 1 |
| `cloud_providers` | Connected cloud storage providers | Phase 1 |
| `plugins` | Installed plugin registry | Phase 1 |
| `settings` | Key-value app settings | Phase 1 |

## Default Content

- 6 categories seeded: Music, Videos, Documents, Archives, Programs, Other
- 7 settings seeded: globalSpeedLimit (0), maxConcurrent (5), theme (dark), autoStart (false), minimizeToTray (true), showNotifications (true), clipboardMonitor (true)

## Key Design Decisions

1. **SQLite via node:sqlite** (not better-sqlite3) — uses Node.js 24's built-in DatabaseSync
2. **Zustand** for renderer state (not Redux) — lightweight, simple
3. **electron-vite** for build — fast, purpose-built for Electron
4. **EventEmitter** pattern for download engine events
5. **Plugin API** is sandboxed — plugins get a controlled API surface, not raw Node.js access
6. **Automation** uses JSON-serialized conditions/actions in SQLite (discriminated unions in TypeScript)
7. **Cron parser** is custom-built (not node-cron) — zero dependencies

## Current File Structure

```
packages/shared/src/
├── index.ts
├── types/
│   ├── download.ts, plugin.ts, automation.ts, cloud.ts, schedule.ts, settings.ts, ipc.ts
├── constants/
│   ├── defaults.ts, enums.ts
└── utils/
    ├── url.ts, filesize.ts, path.ts

packages/main/src/
├── index.ts                    App entry (window, tray, engine init, IPC wiring)
├── download/
│   └── engine.ts               DownloadEngine + DownloadTask (chunked HTTP)
├── ipc/
│   ├── index.ts                registerAllIpc() — wires all handlers
│   ├── download.ipc.ts         Download CRUD handlers
│   ├── settings.ipc.ts         Settings key-value handlers
│   └── category.ipc.ts         Category CRUD handlers
├── storage/
│   ├── database.ts             SQLite init
│   └── migrations/
│       └── 001-initial.sql     Full schema
├── plugins/
│   └── loader.ts               Plugin scanner + PluginAPI
├── automation/
│   └── index.ts                Rule CRUD + persistence
├── scheduler/
│   ├── index.ts                Schedule CRUD + timer management
│   └── cron.ts                 Cron expression parser
├── grabber/                    (Phase 6 — empty)
├── cloud/providers/            (Phase 4 — empty)
├── clipboard/                  (Phase 8 — empty)
├── notifications/              (Phase 8 — empty)
├── queue/                      (Phase 3 — empty)
├── browser-bridge/             (Phase 7 — empty)
├── plugin-system/              (Phase 5 — empty)
└── engine/network/             (empty placeholder)

packages/preload/src/
└── index.ts                    Context bridge (window.api)

packages/renderer/src/
├── main.tsx                    React entry
├── App.tsx                     Router + layout
├── preload.d.ts                window.api type declarations
├── pages/
│   ├── DownloadsPage.tsx       Active downloads + add URL dialog
│   ├── CompletedPage.tsx       Completed downloads list
│   ├── SchedulerPage.tsx       Schedule CRUD UI
│   ├── AutomationPage.tsx      Rule CRUD UI + templates
│   └── SettingsPage.tsx        6-tabbed settings
├── components/
│   ├── layout/
│   │   ├── TitleBar.tsx        Frameless title bar
│   │   ├── Sidebar.tsx         Navigation
│   │   └── StatusBar.tsx       Active count, speed, total
│   └── downloads/
│       ├── DownloadList.tsx
│       └── DownloadItem.tsx
├── stores/
│   ├── download-store.ts       Zustand: Map<id, Download>
│   ├── ui-store.ts             Zustand: theme, sidebar, maximized
│   └── settings-store.ts       Zustand: settings + categories
└── styles/
    └── globals.css             Tailwind CSS

packages/browser-extensions/
├── chrome/                     (Phase 7 — empty)
└── firefox/                    (Phase 7 — empty)

plugins/
└── youtube-extractor/          (Phase 5 — empty)

resources/
├── icons/                      (Phase 9 — empty)
└── native-messaging/           (Phase 7 — empty)
```
