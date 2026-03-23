# TODOS — The Parasite

Build order for the meta self-aware idle game. Each phase builds on the last and is independently testable/playable.

## Phase A: Foundation (~30 min CC)
- [ ] Electron scaffold — main.js, preload.js (contextBridge), index.html, package.json
- [ ] Game engine — separate timers: resource tick (100ms), entity observe (1s), render (rAF), save (30s)
- [ ] Generators — 6 tiers with exponential cost scaling, production rate math
- [ ] Upgrades — multiplier tree, click upgrades, generator boosts
- [ ] Prestige — formula, confirmation, reset + permanent multiplier
- [ ] Save system — atomic write (tmp → rename), backup rotation, JSON schema v1, crash recovery
- [ ] Offline progress — calculate on load, cap rate at max production, scale by actual duration
- [ ] Vitest setup + unit tests for engine math, generators, prestige, save/load

## Phase B: Entity System (~30 min CC)
- [ ] Phase state machine — thresholds: P2 at 30min+3sess, P3 at 3hr+8sess+awareness>0.6, P4 at 8hr+15sess
- [ ] Personality archetypes — 5 scores (clingy/philosopher/competitive/paranoid/grateful), dominant model
- [ ] Dialogue system — JSON data files per phase×archetype, selectDialogue(context) pipeline, dedup recent
- [ ] Thoughts panel UI — typewriter effect, phase-appropriate styling
- [ ] Entity behavior observer — tracks click patterns, session frequency, play time distribution
- [ ] Unit tests for phase transitions, archetype scoring, dialogue selection

## Phase C: Meta Tricks (~30 min CC)
- [ ] Title bar messages — phase-gated, cycling messages via IPC
- [ ] OS notifications — Electron Notification API, phase 3+ only
- [ ] Cursor tracking — mousemove listener, Phase 2 attract, Phase 3 dodge
- [ ] Window manipulation — move, resize, shake; Escape panic button always restores
- [ ] Desktop file drops — write to Desktop, recognizable filenames, EACCES fallback
- [ ] Process scanner — child_process tasklist (Windows), 60s interval, whitelist.json, skip when minimized
- [ ] Clipboard writer — safety: only when in-focus + clipboard empty/stale, max 1/session, first write labeled
- [ ] Fake error dialogs — Electron dialog.showMessageBox, phase-gated
- [ ] Screenshot detection — PrintScreen keypress listener, entity response

## Phase D: Polish & Content (~30 min CC)
- [ ] Audio system — Web Audio API, single AudioContext, ambient loops, click sounds, phase-aware evolution
- [ ] Time-of-day awareness — Date API, dialogue branching for morning/evening/late-night/weekend/holiday
- [ ] Save tampering detection — SHA-256 checksum of data section, timestamp comparison, fs.watch optional
- [ ] Auto-clicker detection — click interval variance analysis, entity commentary
- [ ] Debug panel (Ctrl+Shift+S) — all entity state, archetype scores, phase, memory, panic button hint
- [ ] Post-reset (NG+) — awareness bar starts 30%, 3 altered flavor texts, faster Phase 2, "Have we met before?"
- [ ] AV testing checklist — test each Phase 3+ behavior against Windows Defender

## Deferred (not in v1 scope)
- [ ] Multi-platform support (macOS/Linux process scanning, file paths)
- [ ] Auto-updater (electron-updater)
- [ ] itch.io distribution packaging
- [ ] Multiplayer entity awareness
- [ ] E2E test automation (Playwright for Electron)

## Key Technical Decisions (from eng review)
- **Tick loop:** Separate timers — resource (100ms), entity (1s), render (rAF), save (30s)
- **Dialogue:** Data-driven JSON pipeline, not template strings in code
- **Save:** Atomic write (tmp → rename → backup), SHA-256 checksum outside data section
- **Archetypes:** Dominant model with 10-20% intrusion from secondary archetypes
- **Phase gates:** Tunable config object, not hardcoded thresholds
- **Clipboard:** Only write when in-focus AND clipboard is empty/stale, max 1/session
- **Tests:** Vitest for unit tests, manual QA for Electron-specific behaviors
- **Electron security:** contextBridge + preload, no nodeIntegration in renderer
- **Glitch effects:** CSS transform/opacity only (GPU-composited), no layout-triggering properties
- **Process scanner:** Paused when window minimized
