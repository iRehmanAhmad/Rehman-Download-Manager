# Graph Report - .  (2026-06-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 238 nodes · 368 edges · 57 communities (7 shown, 50 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1228deba`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]

## God Nodes (most connected - your core abstractions)
1. `DownloadTask` - 34 edges
2. `DownloadEngine` - 30 edges
3. `Download` - 18 edges
4. `getDatabase` - 13 edges
5. `QueueSettings` - 10 edges
6. `useDownloadStore` - 9 edges
7. `getDownloadEngine` - 8 edges
8. `registerAllIpc` - 7 edges
9. `RdmApi` - 7 edges
10. `QueueRepository` - 7 edges

## Surprising Connections (you probably didn't know these)
- `RDM Roadmap` --semantically_similar_to--> `RDM`  [INFERRED] [semantically similar]
  ROADMAP.md → README.md
- `Roadmap Tech Stack` --semantically_similar_to--> `Tech Stack`  [INFERRED] [semantically similar]
  ROADMAP.md → README.md
- `Architecture` --semantically_similar_to--> `Project Structure`  [INFERRED] [semantically similar]
  ROADMAP.md → README.md
- `Taste Tech Stack` --conceptually_related_to--> `Roadmap Tech Stack`  [INFERRED]
  .commandcode/taste/taste.md → ROADMAP.md
- `DownloadEngineEvents` --references--> `Download`  [EXTRACTED]
  packages/main/src/download/engine.ts → packages/shared/src/types/download.ts

## Import Cycles
- 1-file cycle: `packages/preload/src/index.ts -> packages/preload/src/index.ts`
- 1-file cycle: `packages/main/src/index.ts -> packages/main/src/index.ts`

## Communities (57 total, 50 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (18): startBrowserBridge, stopBrowserBridge, startClipboardMonitor, ChunkStream, DownloadEngineEvents, SpeedSample, registerQueueHandlers(), initNotifications (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (25): registerAutomationIpc, stopClipboardMonitor, crawlSite, detectVideos, registerCategoryIpc, emitQueueStatus(), getDownloadEngine, getQueueStatus() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (16): api, RdmApi, RdmApi, Window, ChunkInfo, DownloadOptions, DownloadPriority, DownloadStatus (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (14): FindDialog(), MenuBar(), StatusBar, TitleBar, TopToolbar, SchedulerPage(), SettingsPage(), HelpDialog() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (3): TABS, DownloadPanelsDialog(), DownloadPanelsDialogProps

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (3): App Icon, Download Arrow, Background Gradient

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (3): Tech Stack, Roadmap Tech Stack, Taste Tech Stack

## Knowledge Gaps
- **91 isolated node(s):** `evaluateRules`, `getRules`, `registerAutomationIpc`, `startBrowserBridge`, `stopBrowserBridge` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DownloadTask` connect `Community 0` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `Download` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `DownloadEngine` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `evaluateRules`, `getRules`, `registerAutomationIpc` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10541310541310542 - nodes in this community are weakly interconnected._