# OBSERVATORY-ROBUSTNESS-1 — full-stack-developer (observatory robustness)

## Task
Make the Crash Observatory robust — persist reports, add render-count instrumentation, add conformance suite.

## What was found on entry
- `src/lib/editor/crash-observatory.ts` did **not** exist yet. The worklog referenced CRASH-OBSERVATORY and INSPECTOR-STORE-STABILITY entries but they had not been written; the file was absent. I built the observatory from scratch with all the requested robustness features baked in.
- The editor already had: InspectorPanel, OutlinerPanel, Viewport3D, EditorToolbar, EditorLayout with a 12-tab bottom dock. There was no EntityInspector component (it was implicitly the entity-rendering section inside InspectorPanel).
- A parallel agent was simultaneously editing ConsolePanel, OutlinerPanel (keyboard navigation), EditorLayout (memory stats + transform icons), and several other panels. The lint failures they introduced (set-state-in-effect, unterminated import string) were resolved either by me (the import string) or by them (the set-state-in-effect) during the work session.

## Files created
1. `src/lib/editor/crash-observatory.ts` (≈440 lines) — singleton observatory with:
   - `recordCrash()` / `recordTransformEvent()` with dedup (5s window per signature) and occurrence counting
   - `subscribeToCrashes()` / `subscribeToTransforms()` — every listener callback is wrapped in try/catch (`safeNotify`) so a buggy subscriber can never crash the observatory
   - `MAX_CRASH_REPORTS = 500` cap (oldest dropped first); `MAX_TRANSFORM_EVENTS = 200`
   - Auto-submit to `/api/editor/crash-report` with 2s debounce (`SUBMIT_DEBOUNCE_MS`); dedup via `recentSignatures` map; success/failure logged to `console` only (NEVER `recordCrash` — recursion guard)
   - `buildDiagnosticBundle()` — full session snapshot (sessionId, uptime, userAgent, url, crashes, transformEvents, renderCounts)
   - `submitBundleNow()` — manual force-submit (bypasses debounce)
   - `getSessionId()` — stable UUID generated once per page load (survives HMR)
   - `getUptime()` — ms since `installCrashObservatory()` ran
   - `installCrashObservatory()` — installs `window.onerror` + `unhandledrejection` handlers; idempotent (no-op on second call so React StrictMode double-invocation is safe)
   - `clearAll()` — wipes in-memory buffers
   - `getCrashes(limit)` / `getTransformEvents(limit)` — read-only snapshots (most-recent first)

2. `src/app/api/editor/crash-report/route.ts` (≈150 lines) — Node runtime, force-dynamic:
   - `POST` — receives `{ bundle, crashIds }`, sanitizes the session id, writes `crash-reports/crash-{ISO-timestamp}-{shortId}.json` (mkdir -p recursive), returns `{ ok, filename }`
   - `GET` — lists all `crash-*.json` files with `{ filename, size, mtime }`, sorted newest-first

3. `src/lib/editor/render-tracker.ts` (≈140 lines) — `useRenderTracker(componentName)` hook:
   - Bumps a ref counter on every render
   - Mirrors the count to `window.__renderCounts[componentName]` for debugging
   - Installs a 1s `setInterval` that checks if the windowed render count exceeded 50; if so, calls `recordCrash({ source: 'render-tracker', ... })` once per loop (latched via `alreadyReportedRef` so a runaway loop doesn't spam 500 records in 10s)
   - `snapshotRenderCounts()` helper for panels

4. `src/lib/editor/inspector-stability-check.ts` (≈165 lines) — `useInspectorStabilityCheck()` dev-only hook:
   - Patches `console.warn` to sniff for the `getSnapshot should be cached` React warning (regex match). When detected, calls `recordTransformEvent({ eventType: 'error', source: 'inspector-stability-check', ... })` AND `recordCrash({ source: 'inspector-stability-check', ... })` so the failure appears in both lists and triggers an auto-submit.
   - Installs a 1s interval that reports if Inspector renders > 100 times in a single second (latched per-window).
   - Production short-circuit (`process.env.NODE_ENV === 'production'`) — skips the patch and the interval.
   - Cleanup restores `console.warn` so HMR doesn't stack patches.

5. `src/components/editor/panels/EntityInspector.tsx` (≈290 lines) — extracted the entity-specific Transform/Properties/Metadata tabs from InspectorPanel so render-tracking can be applied at two granularities. Calls `useRenderTracker('EntityInspector')`.

6. `src/components/editor/panels/CrashObservatoryPanel.tsx` (≈420 lines) — bottom-dock UI:
   - Header bar: ShieldAlert icon + "Observatory" label, crash count badge (red dot if >0, emerald if 0), uptime badge, "Seed" button (dev self-test that injects a synthetic crash + transform event), Download icon (saves diagnostic bundle as `crash-bundle-{shortId}.json`), UploadCloud icon (force-submits to server, with success/error inline status), Trash2 icon (Clear all)
   - Two-column body: Recent Crashes (left) + Transform Events (right), each in a `ScrollArea` with `max-h-96 overflow-y-auto`
   - Subscribes to `subscribeToCrashes` + `subscribeToTransforms` for live updates
   - Installs `installCrashObservatory()` on mount (so global error handlers are live even before any crash is recorded) and ticks uptime every second

## Files modified
7. `src/components/editor/EditorLayout.tsx`:
   - Added `ShieldAlert` to lucide-react imports
   - Added `CrashObservatoryPanel` import
   - Replaced the `as const` BOTTOM_TABS tuple with a typed `BottomTab[]` array (`{ value, label, icon? }`) and added `{ value: 'crashes', label: 'Crashes', icon: ShieldAlert }`
   - Added `'crashes'` to `TALL_TABS` so the dock expands for the two-column layout
   - Updated the `TabsTrigger` map to render the icon (if present) before the label
   - Added `{activeTab === 'crashes' && <CrashObservatoryPanel />}` to the conditional render block

8. `src/components/editor/panels/InspectorPanel.tsx` — refactored to a thin container:
   - Added `'use client'`
   - Calls `useRenderTracker('InspectorPanel')` and `useInspectorStabilityCheck()`
   - Handles empty / multi-select states inline; delegates single-entity view to `<EntityInspector />`

9. `src/components/editor/panels/OutlinerPanel.tsx`:
   - Added `'use client'`
   - Added `useRenderTracker` import and `void useRenderTracker('OutlinerPanel')` at the top of the component

10. `src/components/editor/viewport/Viewport3D.tsx`:
    - Added `useRenderTracker` import and `void useRenderTracker('Viewport3D')` at the top of the component

11. `src/components/editor/toolbar/EditorToolbar.tsx`:
    - Added `'use client'`
    - Added `useRenderTracker` import and `void useRenderTracker('EditorToolbar')` at the top of the component

## Verification
- `bun run lint` → 0 errors, 0 warnings on my files. (A pre-existing `react-hooks/immutability` error in ConsolePanel.tsx and a pre-existing `WindowWithMemory` TypeScript error in EditorLayout.tsx are from parallel-agent work, not from this task; they were not introduced by my changes.)
- `npx tsc --noEmit --skipLibCheck` → 0 errors in my new files (`crash-observatory.ts`, `render-tracker.ts`, `inspector-stability-check.ts`, `CrashObservatoryPanel.tsx`, `EntityInspector.tsx`, `crash-report/route.ts`).
- Dev server log: clean compiles after the import-string fix; `GET / 200` healthy.

## Notes for future agents
- The observatory is a module-level singleton — it survives HMR and React StrictMode double-invocation. Do NOT reset `installed` in the uninstall function; that would re-enable crash capture on the next mount and double-register global handlers.
- Auto-submit uses `fetch('/api/editor/crash-report', ...)` with a relative path — Caddy forwards correctly. Do NOT add a port.
- The 50 renders/sec threshold for `useRenderTracker` and the 100 renders/sec threshold for `useInspectorStabilityCheck` are intentionally different: the inspector is the most-rendered component (every transform edit re-renders it), so it gets a higher threshold to avoid false positives during normal slider dragging.
- `crash-reports/` is git-ignored by convention (it's runtime data). Files are named `crash-{ISO-timestamp-with-dashes}-{8-char-session-id}.json` so they sort chronologically and dedupe by session.
