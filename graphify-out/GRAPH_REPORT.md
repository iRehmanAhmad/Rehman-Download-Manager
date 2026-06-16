# Graph Report - .  (2026-06-16)

## Corpus Check
- 41 files · ~44,906 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 419 nodes · 664 edges · 67 communities (17 shown, 50 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.88)
- Token cost: 3,500 input · 2,200 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Download Engine (Chunked + Resume)|Download Engine (Chunked + Resume)]]
- [[_COMMUNITY_Main IPC & Background Services|Main IPC & Background Services]]
- [[_COMMUNITY_Renderer UI Pages & Layout|Renderer UI Pages & Layout]]
- [[_COMMUNITY_Roadmap & Monetization Strategy|Roadmap & Monetization Strategy]]
- [[_COMMUNITY_Settings Dialogs|Settings Dialogs]]
- [[_COMMUNITY_Plugin Loader & Queue Repository|Plugin Loader & Queue Repository]]
- [[_COMMUNITY_Grabber & SSRF Guard|Grabber & SSRF Guard]]
- [[_COMMUNITY_Shared Types & Preload Bridge|Shared Types & Preload Bridge]]
- [[_COMMUNITY_Native Messaging Host|Native Messaging Host]]
- [[_COMMUNITY_Plugin Sandbox Host|Plugin Sandbox Host]]
- [[_COMMUNITY_Post-Processing Pipeline|Post-Processing Pipeline]]
- [[_COMMUNITY_Roadmap Browser Integration|Roadmap: Browser Integration]]
- [[_COMMUNITY_Roadmap Plugin System|Roadmap: Plugin System]]
- [[_COMMUNITY_App Icon (SVG)|App Icon (SVG)]]
- [[_COMMUNITY_Roadmap Browser Extension|Roadmap: Browser Extension]]
- [[_COMMUNITY_Tech Stack|Tech Stack]]
- [[_COMMUNITY_Browser Extension Popups|Browser Extension Popups]]
- [[_COMMUNITY_App ConstantsDefaults|App Constants/Defaults]]
- [[_COMMUNITY_Roadmap Clipboard & Notifications|Roadmap: Clipboard & Notifications]]
- [[_COMMUNITY_Roadmap Scheduler & Cron|Roadmap: Scheduler & Cron]]
- [[_COMMUNITY_Readme Project|Readme Project]]
- [[_COMMUNITY_Readme Rdm|Readme Rdm]]
- [[_COMMUNITY_Automation Evaluator|Automation Evaluator]]
- [[_COMMUNITY_Automation Index|Automation Index]]
- [[_COMMUNITY_Clipboard Index|Clipboard Index]]
- [[_COMMUNITY_Electron Builder|Electron Builder]]
- [[_COMMUNITY_Notifications Index|Notifications Index]]
- [[_COMMUNITY_Pnpm Workspace|Pnpm Workspace]]
- [[_COMMUNITY_Rdm Roadmap|Rdm Roadmap]]
- [[_COMMUNITY_Rdm Roadmap|Rdm Roadmap]]
- [[_COMMUNITY_Rdm Roadmap|Rdm Roadmap]]
- [[_COMMUNITY_Rdm Roadmap|Rdm Roadmap]]
- [[_COMMUNITY_Rdm Roadmap|Rdm Roadmap]]
- [[_COMMUNITY_Rdm Roadmap|Rdm Roadmap]]
- [[_COMMUNITY_Rdm Roadmap|Rdm Roadmap]]
- [[_COMMUNITY_Rdm Screenshot|Rdm Screenshot]]
- [[_COMMUNITY_Renderer Index|Renderer Index]]
- [[_COMMUNITY_Roadmap Database|Roadmap Database]]
- [[_COMMUNITY_Roadmap Design|Roadmap Design]]
- [[_COMMUNITY_Scheduler Cron|Scheduler Cron]]
- [[_COMMUNITY_Scheduler Cron|Scheduler Cron]]
- [[_COMMUNITY_Scheduler Cron|Scheduler Cron]]
- [[_COMMUNITY_Stores Ui|Stores Ui]]
- [[_COMMUNITY_Taste Taste|Taste Taste]]
- [[_COMMUNITY_Types Automation|Types Automation]]
- [[_COMMUNITY_Types Automation|Types Automation]]
- [[_COMMUNITY_Types Automation|Types Automation]]
- [[_COMMUNITY_Types Cloud|Types Cloud]]
- [[_COMMUNITY_Types Cloud|Types Cloud]]
- [[_COMMUNITY_Types Cloud|Types Cloud]]
- [[_COMMUNITY_Types Cloud|Types Cloud]]
- [[_COMMUNITY_Types Plugin|Types Plugin]]
- [[_COMMUNITY_Types Plugin|Types Plugin]]
- [[_COMMUNITY_Types Plugin|Types Plugin]]
- [[_COMMUNITY_Types Schedule|Types Schedule]]
- [[_COMMUNITY_Utils Filesize|Utils Filesize]]
- [[_COMMUNITY_Utils Filesize|Utils Filesize]]
- [[_COMMUNITY_Utils Filesize|Utils Filesize]]
- [[_COMMUNITY_Utils Path|Utils Path]]
- [[_COMMUNITY_Utils Path|Utils Path]]
- [[_COMMUNITY_Utils Path|Utils Path]]
- [[_COMMUNITY_Utils Path|Utils Path]]
- [[_COMMUNITY_Utils Url|Utils Url]]
- [[_COMMUNITY_Utils Url|Utils Url]]
- [[_COMMUNITY_Utils Url|Utils Url]]
- [[_COMMUNITY_Utils Url|Utils Url]]

## God Nodes (most connected - your core abstractions)
1. `DownloadTask` - 38 edges
2. `DownloadEngine` - 33 edges
3. `getDatabase` - 24 edges
4. `Download` - 18 edges
5. `useDownloadStore` - 17 edges
6. `QueueSettings` - 10 edges
7. `getDownloadEngine` - 9 edges
8. `registerAllIpc` - 8 edges
9. `RDM Pro Paid Tier` - 8 edges
10. `crawlSite` - 7 edges

## Surprising Connections (you probably didn't know these)
- `RDM Roadmap` --semantically_similar_to--> `RDM`  [INFERRED] [semantically similar]
  ROADMAP.md → README.md
- `Roadmap Tech Stack` --semantically_similar_to--> `Tech Stack`  [INFERRED] [semantically similar]
  ROADMAP.md → README.md
- `Architecture` --semantically_similar_to--> `Project Structure`  [INFERRED] [semantically similar]
  ROADMAP.md → README.md
- `Rehman Download Manager (RDM)` --semantically_similar_to--> `RDM — Reactive Download Manager`  [INFERRED] [semantically similar]
  STRATEGY.md → ROADMAP.md
- `Built-in Converter & Smart Unarchiver (Pro)` --semantically_similar_to--> `Built-in Media Converter (FFmpeg)`  [INFERRED] [semantically similar]
  STRATEGY.md → ROADMAP.md

## Import Cycles
- 1-file cycle: `packages/preload/src/index.ts -> packages/preload/src/index.ts`
- 1-file cycle: `packages/main/src/index.ts -> packages/main/src/index.ts`

## Hyperedges (group relationships)
- **RDM Pro Premium Feature Set** — rdm_strategy_rdm_pro, rdm_strategy_social_mass_grabber, rdm_strategy_debrid_integration, rdm_strategy_converter_unarchiver, rdm_strategy_media_preview, rdm_strategy_virustotal_scanning [EXTRACTED 1.00]
- **Phase 12 Reliability & Security Hardening** — rdm_roadmap_ssrf_guard, rdm_roadmap_plugin_host, rdm_roadmap_browser_bridge, rdm_roadmap_reconcile_chunks, rdm_roadmap_migration_runner [EXTRACTED 1.00]
- **Browser Download Interception Flow** — rdm_roadmap_chrome_extension, rdm_roadmap_firefox_extension, rdm_roadmap_native_messaging_host, rdm_roadmap_browser_bridge [EXTRACTED 1.00]

## Communities (67 total, 50 thin omitted)

### Community 0 - "Download Engine (Chunked + Resume)"
Cohesion: 0.06
Nodes (4): DownloadEngine, DownloadTask, DownloadState, Download

### Community 1 - "Main IPC & Background Services"
Cohesion: 0.07
Nodes (44): registerAutomationIpc, getBridgeToken(), startBrowserBridge, stopBrowserBridge, startClipboardMonitor, stopClipboardMonitor, ChunkStream, DownloadEngineEvents (+36 more)

### Community 2 - "Renderer UI Pages & Layout"
Cohesion: 0.08
Nodes (21): FindDialog(), MenuBar(), Sidebar(), formatSpeed(), StatusBar, TitleBar, TopToolbar, AutomationPage() (+13 more)

### Community 3 - "Roadmap & Monetization Strategy"
Cohesion: 0.06
Nodes (36): Advanced Resume Capability, Antivirus Integration, Multi-algorithm Checksum Verification, Debrid / Premium Link Unshackler, DownloadEngine (engine.ts), DownloadManager, Dynamic Segmentation Engine, electron-vite Build (+28 more)

### Community 4 - "Settings Dialogs"
Cohesion: 0.07
Nodes (17): SettingsPage(), SOUND_EVENTS, TABS, AddressExceptionsDialog(), AddressExceptionsDialogProps, CategoryDialog(), CategoryDialogProps, ConnectionException (+9 more)

### Community 5 - "Plugin Loader & Queue Repository"
Cohesion: 0.13
Nodes (23): registerCategoryIpc, disablePlugin, emitPluginEvent(), enablePlugin, getHostPath(), getLoadedPlugins, getPluginDir, getPluginInstance (+15 more)

### Community 6 - "Grabber & SSRF Guard"
Cohesion: 0.17
Nodes (17): handleBridgeMessage(), sendBridgeResponse(), ARCHIVE_EXTS, AUDIO_EXTS, crawlSite, detectType(), detectVideos, extractFilename() (+9 more)

### Community 7 - "Shared Types & Preload Bridge"
Cohesion: 0.13
Nodes (14): api, RdmApi, RdmApi, Window, ChunkInfo, DownloadOptions, DownloadPriority, DownloadStatus (+6 more)

### Community 8 - "Native Messaging Host"
Cohesion: 0.31
Nodes (8): { createConnection }, getBridgeToken(), handleMessage(), { join }, messageBuffer, { readFileSync }, readMessage(), sendResponse()

### Community 9 - "Plugin Sandbox Host"
Cohesion: 0.22
Nodes (5): eventHandlers, HostMessage, InitMessage, pending, permissions

### Community 10 - "Post-Processing Pipeline"
Cohesion: 0.36
Nodes (7): ARCHIVE_EXTS, GetSetting, isArchive(), PostProcessResult, replaceExt(), runPostProcessing(), runProcess()

### Community 11 - "Roadmap: Browser Integration"
Cohesion: 0.29
Nodes (7): Browser Bridge TCP Server, Chrome Extension (manifest v3), Firefox Extension (manifest v2), The Grabber (Web Spidering), Grabber Video Detection Engine, Native Messaging Host (TCP bridge), SSRF Guard (net/ssrf-guard.ts)

### Community 12 - "Roadmap: Plugin System"
Cohesion: 0.50
Nodes (4): Sandboxed Plugin API, Plugin Host (utilityProcess sandbox), Plugin Loader, YouTube Extractor Plugin

### Community 13 - "App Icon (SVG)"
Cohesion: 0.67
Nodes (3): App Icon, Download Arrow, Background Gradient

### Community 14 - "Roadmap: Browser Extension"
Cohesion: 0.67
Nodes (3): Browser Extension, Download All Feature, Native Messaging Bridge

### Community 15 - "Tech Stack"
Cohesion: 0.67
Nodes (3): Tech Stack, Roadmap Tech Stack, Taste Tech Stack

## Knowledge Gaps
- **134 isolated node(s):** `evaluateRules`, `getRules`, `registerAutomationIpc`, `isClipboardMonitorRunning`, `GrabResult` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DownloadTask` connect `Download Engine (Chunked + Resume)` to `Main IPC & Background Services`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `Download` connect `Download Engine (Chunked + Resume)` to `Main IPC & Background Services`, `Renderer UI Pages & Layout`, `Shared Types & Preload Bridge`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `DownloadEngine` connect `Download Engine (Chunked + Resume)` to `Main IPC & Background Services`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `evaluateRules`, `getRules`, `registerAutomationIpc` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Download Engine (Chunked + Resume)` be split into smaller, more focused modules?**
  _Cohesion score 0.06286748077792854 - nodes in this community are weakly interconnected._
- **Should `Main IPC & Background Services` be split into smaller, more focused modules?**
  _Cohesion score 0.0711864406779661 - nodes in this community are weakly interconnected._
- **Should `Renderer UI Pages & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.07678075855689177 - nodes in this community are weakly interconnected._