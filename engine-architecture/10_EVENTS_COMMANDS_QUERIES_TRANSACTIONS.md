# 10 — Events, Commands, Queries, Transactions

**Status:** Foundation architecture. The engine's inter-plugin communication fabric.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (CBOR, SHA-256, RNG), `ga:core` (PluginHost), `07_SCHEDULER_FRAME_LOOP_TIME_DOMAINS` (tick-bounded dispatch), `09_ENTITY_RUNTIME_STATE_ARCHITECTURE` (entity IDs as event targets)
**Read with:** `17_ENGINE_ARCHITECTURE §1.2` (PluginHost event bus), `00_FOUNDATIONAL_DECISIONS` (input log contract)

---

## 0. What this document is

Plugins do not call each other directly. They communicate through the event bus: typed events for things that have happened, typed commands for things a plugin wants another plugin to do, and typed queries for read-only inspection. This document specifies the three message kinds, synchronous vs asynchronous dispatch, in-tick event ordering, the no-re-entrancy rule, the inclusion of events in the input log (for deterministic replay), priority by event type, transactional state changes (read/write sets, reservations, commit/abort), and how cross-plugin communication works through events rather than direct state access.

The central tension: **plugins must be decoupled (the engine is a plugin host, not a monolith); the simulation must be deterministic (every state change must be reproducible from the input log).** The resolution is that *every* state-changing communication is an event recorded in the input log, dispatched synchronously within a single fixed tick, and never re-entrant. Plugins that need to read another plugin's state use queries; plugins that need to change another plugin's state emit a command; the receiving plugin commits the change in its own system, within its own write-set.

---

## 1. The three message kinds

```
┌──────────────────────────────────────────────────────────────────┐
│                  EVENT BUS MESSAGE KINDS                         │
│                                                                  │
│  EVENT    ── "Something happened."                               │
│              Past tense. Facts about the world.                  │
│              Many listeners. Fire-and-forget.                    │
│              Example: 'ga:combat.AttackLanded'                   │
│                                                                  │
│  COMMAND  ── "Please do this."                                   │
│              Imperative. Directed at one plugin.                 │
│              May be rejected. Returns a result.                  │
│              Example: 'ga:npc-sim.MoveNpc'                       │
│                                                                  │
│  QUERY    ── "What is the state of X?"                           │
│              Read-only. Synchronous. No side effects.            │
│              Example: 'ga:combat.GetCombatState(entityId)'       │
│                                                                  │
│  All three are:                                                  │
│    • Typed (TypeScript discriminated unions)                     │
│    • CBOR-serializable (events and commands are in the input log)│
│    • Tick-stamped (every message carries the tick it was issued) │
│    • Plugin-scoped (every type tag includes the emitting plugin) │
└──────────────────────────────────────────────────────────────────┘
```

### 1.1 TypeScript interfaces

```typescript
/** The base shape every event/command/query implements. */
interface BusMessage {
  /** Discriminator: 'event' | 'command' | 'query'. */
  kind: 'event' | 'command' | 'query';
  /** The type tag, namespaced: 'ga:combat.AttackLanded', 'ga:npc-sim.MoveNpc'. */
  type: string;
  /** The fixed tick at which this message was issued. */
  tick: bigint;
  /** The plugin that emitted the message. */
  source: string;
  /** A deterministic message ID, derived from (tick, source, type, seq). */
  id: bigint;
}

interface Event<P = unknown> extends BusMessage {
  kind: 'event';
  payload: P;
}

interface Command<P = unknown, R = void> extends BusMessage {
  kind: 'command';
  payload: P;
  /** Resolves with the command's result, or rejects with a CommandError. */
  result: Promise<R>;
}

interface Query<P = unknown, R = unknown> extends BusMessage {
  kind: 'query';
  payload: P;
  /** The synchronous result. Queries never return promises. */
  result: R;
}

/** A command error. Thrown by the receiving plugin when it rejects. */
interface CommandError {
  code: 'rejected' | 'invalid' | 'unauthorized' | 'transient';
  message: string;
  /** Whether the caller should retry. True only for 'transient'. */
  retryable: boolean;
}
```

### 1.2 Why three kinds, not one

A single `emit(type, payload)` API (à la Node's `EventEmitter`) conflates three distinct communications. Splitting them lets the engine enforce different rules:

- **Events** are facts. They cannot be rejected. They are dispatched to *all* subscribers. They are always in the input log.
- **Commands** are requests. They *can* be rejected. They are dispatched to *one* handler (the plugin that owns the command's domain). They are in the input log; their *result* is not (the result is reproducible from the input + the sim state).
- **Queries** are read-only. They are *not* in the input log (they don't change state). They execute synchronously and return immediately.

---

## 2. Synchronous vs asynchronous dispatch

### 2.1 Synchronous (within a tick)

Events and commands issued during a fixed tick are dispatched **synchronously at the end of the tick**, in priority order (§4). The issuing system does not see the dispatch — it sees only the next tick's state, which reflects the dispatched events' effects. This is the **no-re-entrancy rule** (§5).

Queries are dispatched **synchronously immediately**. A query blocks the issuing system until the handler returns. Queries must complete in < 0.1 ms (enforced by a budget guard; violations are flagged in dev mode).

### 2.2 Asynchronous (across ticks)

Some commands cannot complete within one tick — e.g., `ga:assets.LoadAsset(hash)` may take many frames. These are **async commands**: their `result` promise resolves in a future tick. The async command's *issuance* is in the input log; the *resolution* is not (it is a function of the asset pipeline, not the sim).

```typescript
interface AsyncCommand<P = unknown, R = void> extends BusMessage {
  kind: 'command';
  async: true;
  payload: P;
  result: Promise<R>;
  /** The tick by which this must resolve, or it is cancelled. */
  deadlineTick: bigint;
}
```

Async commands are the *only* async path in the event bus. Events are always sync. Queries are always sync. Sync commands that *need* to be async are a design smell — split them into a sync command that queues the work and an event that fires when the work completes.

### 2.3 The dispatch timeline

```
Fixed tick N begins
  → system A runs: emits event E1, issues command C1, queries Q1
  → Q1 resolves immediately (sync)
  → system B runs: emits E2
  → system C runs: issues async command AC1 (deadline tick N+10)
  → ...
  → all systems done
  → end-of-tick dispatch:
      → C1 dispatched to its handler (sync); handler runs; C1.result resolves
      → E1 dispatched to all subscribers (sync); each handler runs
      → E2 dispatched to all subscribers (sync)
  → AC1 is enqueued; its handler will run on the ASSET worker; its result
     will resolve in tick N+K (K ≤ 10)
  → snapshot + hash
  → tick N+1 begins
```

The dispatch is *after* all systems, so systems see a consistent view of tick N. The next tick sees the dispatched events' effects.

---

## 3. The no-re-entrancy rule

**No event handler may emit an event that is dispatched in the same tick.** If a handler needs to communicate, it emits an event that is queued for the *next* tick's dispatch.

```typescript
// Forbidden: re-entrancy
on('ga:combat.AttackLanded', (e) => {
  // This event would dispatch in the same tick — re-entrancy.
  emit('ga:qi.QiDischarged', { ... });  // THROWS in dev mode
});

// Correct: queue for next tick
on('ga:combat.AttackLanded', (e) => {
  // This event is stamped tick = e.tick + 1n, dispatched at end of tick N+1.
  emit({ type: 'ga:qi.QiDischarged', payload: { ... }, delayTicks: 1n });
});
```

### 3.1 Why

Re-entrancy breaks the contract that systems see a consistent snapshot of tick N. If a handler's emission were dispatched immediately, subsequent handlers in the same dispatch batch would see different state than earlier ones. The dispatch order would become observable and the input log would not capture the implicit orderings.

### 3.2 Enforcement

In dev mode, the event bus tracks the current dispatch depth. Any `emit` call made from within a handler increments the depth; if depth > 0 and the emission's `delayTicks === 0n`, the bus throws `ReentrancyViolation`. In production, the bus silently re-stamps the event with `delayTicks: 1n` and logs a warning.

---

## 4. Event ordering within a tick

### 4.1 The dispatch order

At end-of-tick dispatch, events are sorted by:

1. **Priority** (lower = first). Each event type has a priority, set at registration. System-lifecycle events (`ga:core.SystemInit`) are priority 0. Gameplay events (`ga:combat.AttackLanded`) are priority 100. UI events (`ga:ui.PanelOpened`) are priority 500.
2. **Tick sequence** (within the same priority, FIFO by emission order).
3. **Source plugin ID** (within the same priority and sequence, alphabetical — for deterministic tie-breaking across browsers).

### 4.2 Why priority

Some events must be processed before others. `ga:combat.AttackLanded` (priority 100) must be processed before `ga:ui.PanelOpened` (priority 500) so the UI shows the post-attack state, not the pre-attack state. The priority is the engine's way of saying "this event is more important to the sim than that one."

### 4.3 The priority registry

```typescript
interface EventPriorityRegistry {
  /** Register a priority for an event type. Must be set at plugin init. */
  set(type: string, priority: number): void;
  /** Lookup. Unregistered types default to priority 250 (mid-gameplay). */
  get(type: string): number;
}

// Conventional bands:
//   0-49:    engine lifecycle (init, shutdown, save)
//   50-99:   input (input barrier commit, device events)
//   100-199: gameplay (combat, qi, NPC state changes)
//   200-299: derived (perception, animation triggers)
//   300-399: streaming (tier changes, asset load/unload)
//   400-499: save (checkpoint, migration)
//   500+:    UI (panel open/close, toast, dialogue)
```

### 4.4 Deterministic ordering

The three-level sort (priority, sequence, source) produces a total order that is reproducible from the input log. Two browsers receiving the same input log produce the same dispatch order, hence the same final state, hence the same hash.

---

## 5. Events as part of the input log

### 5.1 What goes in the log

Every **event** and every **command** (sync and async issuance) is appended to the input log. Queries are *not* logged (they are read-only; their result is a function of the sim state, not an input).

The input log is the canonical replay record. Loading a save = restore the nearest checkpoint + replay the input log from that point.

```typescript
interface InputLogEntry {
  /** The tick this entry was emitted. */
  tick: bigint;
  /** Sequential index within the tick. */
  seq: number;
  /** 'event' | 'command'. */
  kind: 'event' | 'command';
  /** The type tag. */
  type: string;
  /** The source plugin. */
  source: string;
  /** The CBOR-encoded payload. */
  payloadCbor: Uint8Array;
  /** For commands, the resolved result (CBOR). For events, undefined. */
  resultCbor?: Uint8Array;
}
```

### 5.2 Why commands' results are logged but events' effects are not

A command's result is a function of the receiving plugin's state at tick N, which may include non-deterministic inputs (e.g., the asset pipeline's load time). Logging the result lets the replay skip the actual command execution and apply the recorded result. (This is a trade-off: it makes the log larger, but it makes replay robust to worker timing differences.)

Events' effects (the state changes the event triggered) are *not* logged — they are reproduced by re-dispatching the event during replay. This is correct because events are dispatched deterministically (§4.4) and their handlers are deterministic (they read only sim state, which is reproducible).

### 5.3 The replay invariant

```typescript
function replay(checkpoint: Checkpoint, log: InputLogEntry[]): Hash {
  const sim = restoreFromCheckpoint(checkpoint);
  for (const entry of log) {
    sim.advanceToTick(entry.tick);
    if (entry.kind === 'event') {
      sim.redispatch(entry);  // re-runs all handlers for this event
    } else {  // command
      sim.applyCommandResult(entry);  // applies the recorded result, skips execution
    }
  }
  return sim.hash();
}
```

This is the same invariant as `07_SCHEDULER §4.1`, made concrete for the event bus.

---

## 6. Priority by event type (full table)

| Band | Priority | Examples |
|---|---|---|
| Lifecycle | 0–49 | `ga:core.EngineInit`, `ga:core.EngineShutdown`, `ga:core.PluginLoaded` |
| Input | 50–99 | `ga:input.InputCommitted`, `ga:input.PointerDown` |
| Gameplay | 100–199 | `ga:combat.AttackLanded`, `ga:qi.QiDischarged`, `ga:npc-sim.NpcMoved`, `ga:ecology.CropHarvested` |
| Derived | 200–299 | `ga:perception.ResidueRead`, `ga:animation.ClipChanged` |
| Streaming | 300–399 | `ga:streaming.TierChanged`, `ga:assets.AssetLoaded`, `ga:assets.AssetUnloaded` |
| Save | 400–499 | `ga:save.Checkpoint`, `ga:save.MigrationNeeded`, `ga:save.BranchCreated` |
| UI | 500+ | `ga:ui.PanelOpened`, `ga:ui.ToastShown`, `ga:ui.DialogueLine` |

### 6.1 Why this ordering

Lifecycle before input (engine must be ready before input is committed). Input before gameplay (input drives gameplay). Gameplay before derived (derived is a function of gameplay). Derived before streaming (streaming responds to derived state). Streaming before save (save checkpoints include streaming's tier assignments). Save before UI (UI shows post-save state).

A plugin that violates this (e.g., a UI event emitted at priority 50) is a bug. The dev mode linter checks priorities at registration.

---

## 7. Transactional state changes

### 7.1 The problem

Some state changes touch multiple plugins. A combat attack lands: `ga:combat` updates the attacker's stamina and the defender's health; `ga:qi` updates both entities' qi-residue; `ga:npc-sim` updates the defender's `heartMind` (the trauma of being hit); `ga:ecology` updates the location's qi-residue (violence leaves residue, doc 07 §3.2). These changes must be **atomic** — either all happen, or none happen. If `ga:qi` fails mid-attack, the world is left in an inconsistent state.

### 7.2 The transaction interface

```typescript
interface Transaction {
  /** The tick this transaction is open in. */
  tick: bigint;
  /** The read set: component (entityId, type) pairs the transaction read. */
  reads: Set<string>;  // 'entityId:type'
  /** The write set: component (entityId, type) pairs the transaction intends to write. */
  writes: Set<string>;
  /** Reservations: write-locks acquired on the write set. */
  reservations: Map<string, Reservation>;
  /** Open the transaction. Acquires reservations. */
  open(): void;
  /** Commit. Applies all writes atomically. Releases reservations. */
  commit(): void;
  /** Abort. Discards writes. Releases reservations. */
  abort(): void;
}

interface Reservation {
  /** The (entityId, type) reserved. */
  key: string;
  /** The transaction holding the reservation. */
  holder: Transaction;
  /** Whether the reservation is exclusive (write) or shared (read). */
  mode: 'read' | 'write';
}
```

### 7.3 The transaction lifecycle

```
System A wants to land an attack:
  1. tx = host.openTransaction()
  2. Read attacker.CombatState, defender.CombatState, defender.QiState → tx.reads
  3. Reserve writes on:
       attacker.CombatState, attacker.QiState,
       defender.CombatState, defender.QiState, defender.NpcState,
       location.QiResidue
     → tx.reservations
  4. If any reservation fails (another transaction holds a conflicting lock):
       tx.abort(); retry next tick OR queue the attack for later
  5. Compute the new values (stamina, health, qi-residue, heartMind)
  6. tx.commit():
       - Verify no read in tx.reads has changed since step 2 (optimistic)
       - If changed: tx.abort(); retry
       - Else: apply all writes atomically (one synchronous block)
       - Release all reservations
  7. Emit 'ga:combat.AttackLanded' event (dispatched at end of tick)
```

### 7.4 Read/write set validation

Transactions are **optimistic**: they assume their reads are stable. At commit, the bus verifies that no other transaction has written to a component in this transaction's read set. If any read is stale, the transaction aborts and the system retries (or queues for next tick).

This is inspired by software transactional memory (STM), but simplified: there is no automatic retry, no isolation levels, no nested transactions. Systems are expected to handle abort explicitly.

### 7.5 Why transactions, not direct writes

Direct cross-plugin writes (`host.setState('ga:qi', ...)` from `ga:combat`) violate the contract that a plugin only writes its own state. Without transactions, the engine would need a way for `ga:combat` to ask `ga:qi` to update — which is what commands are for. But commands are *requests*; they can be rejected. Transactions make the multi-plugin update atomic: either all plugins commit, or none do.

In practice, transactions are used for high-stakes atomic updates (combat, economy trades, sect diplomacy). For simpler updates, commands suffice: `ga:combat` emits a `ga:qi.ApplyResidue` command with the desired change; `ga:qi`'s handler applies it. If `ga:qi` rejects (rare), `ga:combat` rolls back via its own compensating command. Transactions are reserved for cases where rollback is expensive or impossible.

---

## 8. How cross-plugin communication works

### 8.1 The rule

**Plugins never call another plugin's methods directly.** All communication goes through the event bus. This is enforced structurally:

- The `PluginHost` interface (doc 17 §1.2) exposes `getState`, `setState`, `emit`, `on`, `registerSystem`, `registerTweakPanel` — there is no `getPlugin(id)` method.
- Plugins are loaded in dependency order; a plugin receives only the `PluginHost`, not references to other plugins.
- TypeScript types make a plugin's API surface self-contained: a plugin exports its `Plugin` object and its event/command/query type tags, nothing else.

### 8.2 The communication patterns

```
Pattern 1: "I did something; whoever cares, react."
  → emit an Event.
  → Example: ga:combat emits 'ga:combat.AttackLanded'.
  → ga:qi listens, applies residue.
  → ga:npc-sim listens, updates heartMind.
  → ga:ui listens, shows damage number.

Pattern 2: "I need you to do something."
  → issue a Command.
  → Example: ga:combat issues 'ga:npc-sim.MoveNpc' to move the attacker.
  → ga:npc-sim handles; returns success or rejection.

Pattern 3: "I need to know your state."
  → issue a Query.
  → Example: ga:combat queries 'ga:qi.GetQiState(defenderId)'.
  → ga:qi returns the QiState synchronously.

Pattern 4: "We need to update multiple plugins atomically."
  → open a Transaction.
  → Example: ga:combat opens a tx, reserves writes on ga:combat, ga:qi, ga:npc-sim, ga:ecology.
  → commits or aborts.
```

### 8.3 The contract enforcement

The dev-mode `PluginHost` proxy intercepts every `setState` call and verifies the caller is the plugin that owns the slice. A cross-plugin direct write throws `UnauthorizedWrite`. The only way to change another plugin's state is to emit a command (which the owning plugin handles) or open a transaction (which the bus mediates).

---

## 9. 16 questions answered

1. **What is this system?** The event bus: typed events, commands, queries; synchronous in-tick dispatch; no re-entrancy; transactions for atomic multi-plugin updates.

2. **What problem does it solve?** Plugins must be decoupled; the sim must be deterministic. The bus makes every state-changing communication a logged, ordered, deterministic event.

3. **Core abstractions?** `BusMessage`, `Event`, `Command`, `Query`, `AsyncCommand`, `CommandError`, `EventPriorityRegistry`, `Transaction`, `Reservation`, `InputLogEntry`.

4. **Data flow?** System emits → bus queues for end-of-tick dispatch → handlers run in priority order → state changes via `host.setState` (within the handler's write-set or a transaction) → next tick sees the new state.

5. **Lifecycle?** Plugins register handlers at init; handlers fire until plugin destroy. Transactions open within a system, commit/abort within the same tick.

6. **Invariants?** (a) No re-entrancy (handlers can't emit same-tick). (b) Events and commands are in the input log; queries are not. (c) Dispatch order is deterministic (priority, sequence, source). (d) Cross-plugin writes go through commands or transactions, never direct. (e) Transactions are atomic (all-or-nothing).

7. **Inputs?** Systems emit events and issue commands; external channels (WebSocket, worker inbox) inject commands via the input barrier (doc 07 §2.1).

8. **Outputs?** State changes (via handlers' `setState` calls), command results (sync or async), query results (sync), and the input log (appended for events and commands).

9. **Failure modes?** Re-entrancy (thrown in dev, re-stamped in prod), command rejection (handler returns CommandError), transaction abort (retry or queue), input-log overflow (rotate to next OPFS blob), priority inversion (a high-priority event waiting on a low-priority handler — mitigated by the no-re-entrancy rule, which prevents inversion within a tick).

10. **Performance budget?** Event dispatch < 0.5 ms per tick for 1000 events. Query response < 0.1 ms per query. Transaction open+commit < 0.2 ms. Input-log append < 0.01 ms per entry.

11. **Test requirements?** Dispatch-order determinism (across browsers), no-re-entrancy enforcement, transaction atomicity (abort leaves no partial state), input-log replay correctness, priority inversion absence, command-rejection propagation.

12. **Extension points?** Plugins register event/command/query types and handlers. New priority bands require a core-engine change (the bands are closed). New transaction strategies (e.g., distributed) are out of scope.

13. **Security/isolation?** Plugins cannot directly access another plugin's state. The dev-mode `PluginHost` proxy intercepts all writes. The bus validates every command's payload against the registered schema before dispatch. Untrusted plugins (loaded from CDN) run with a reduced bus surface — they can emit events and issue queries but cannot open transactions.

14. **Rejected alternatives?** (a) Direct plugin-to-plugin method calls — rejected because it couples plugins and breaks the input log. (b) Node-style EventEmitter — rejected because it conflates events/commands/queries and lacks ordering guarantees. (c) Reactive streams (RxJS) — rejected for cascade cost and harder per-frame budgeting. (d) Pure actor model (each plugin is an actor with a mailbox) — rejected because the sim must be single-threaded; actors imply parallelism. (e) Implicit ordering (handlers fire in subscription order) — rejected because subscription order is not deterministic across browsers. (f) Auto-retry transactions (STM-style) — rejected because retry semantics for gameplay code are unclear; explicit retry is safer.

15. **Dependencies?** Depends on `ga:determinism` (CBOR for payloads, RNG for message IDs), `ga:core`, `07_SCHEDULER` (tick boundaries for dispatch). Depended on by every plugin, the save system (input log), the renderer (events for derive triggers), and the WebSocket API (command injection).

16. **What this enables?** Decoupled plugins that communicate through a deterministic, logged channel; replay from any checkpoint; AI-tunable gameplay via command injection; atomic multi-plugin updates (combat, economy); and the branching-save system (doc 11), which relies on the input log being a complete record of state changes.

---

## 10. Test requirements (detailed)

### 10.1 Dispatch-order determinism

Emit 1000 events with random priorities from 100 systems. Assert the dispatch order is identical across Chrome, Firefox, Safari. Assert the order matches the spec: priority, then sequence, then source.

### 10.2 No-re-entrancy enforcement

Register a handler that emits another event with `delayTicks: 0n`. Assert the bus throws `ReentrancyViolation` in dev mode. Assert the event is re-stamped with `delayTicks: 1n` in production and a warning is logged.

### 10.3 Transaction atomicity

Open a transaction that writes to three plugins. Mid-transaction, simulate a failure in the second write. Assert `abort()` rolls back the first write. Assert no reservations remain held. Assert no event was emitted (events are emitted only on commit, by the system, not by the transaction).

### 10.4 Input-log replay

Run a 1000-tick sim, capturing the input log. Restore the nearest checkpoint (tick 500). Replay the log from tick 500 to 1000. Assert the final hash matches the original sim's hash at tick 1000.

### 10.5 Priority inversion absence

Schedule a low-priority handler that takes 5 ms. Emit a high-priority event after it. Assert the high-priority event's handler runs before any subsequent low-priority handler, even though the low-priority handler is still running (this is guaranteed by the no-re-entrancy rule: handlers run sequentially, not concurrently).

### 10.6 Command rejection propagation

Issue a command that the handler rejects with `code: 'rejected'`. Assert the `result` promise rejects with the `CommandError`. Assert the issuing system can catch the rejection and recover (e.g., queue the command for next tick).

### 10.7 Async command deadline

Issue an async command with `deadlineTick: N+10`. Delay the handler beyond tick N+10. Assert the command is cancelled, the `result` rejects with `code: 'transient'`, and the issuing system can retry.

---

## 11. Failure cases and recovery

| Failure | Detection | Recovery |
|---|---|---|
| Re-entrancy attempt | Dev-mode depth check | Throw (dev) or re-stamp (prod) |
| Command rejection | Handler returns CommandError | Caller catches; retries or queues |
| Transaction abort | Read-set validation at commit | Caller retries or queues |
| Handler throws (uncaught) | Bus wraps every handler in try/catch | Log the error; emit `ga:core.HandlerFailed`; continue dispatch (the sim does not crash) |
| Input-log write fails (OPFS full) | OPFS error | Rotate to IndexedDB cold tier (doc 11); if that fails, halt the sim with `SaveFailure` |
| Priority inversion (rare) | No-re-entrancy rule prevents within-tick inversion | N/A |
| Deadlock (two transactions waiting on each other's reservations) | Reservation timeout (100 ms) | Abort both; queue both for next tick |

---

## 12. Rejected alternatives (summary)

- **Direct plugin-to-plugin calls.** Couples plugins. Breaks the input log. Rejected.
- **Node EventEmitter.** Conflates event/command/query. No ordering guarantees. Rejected.
- **Reactive streams (RxJS).** Cascade cost. Harder budgeting. Rejected.
- **Actor model.** Implies parallelism; the sim is single-threaded. Rejected.
- **Implicit subscription-order dispatch.** Not deterministic across browsers. Rejected.
- **Auto-retry transactions.** Retry semantics for gameplay unclear. Explicit retry is safer. Rejected.
- **Single bus (no command/query split).** Loses the read-only fast path for queries and the single-handler invariant for commands. Rejected.

---

## 13. What this document enables

- **Decoupled plugins** that communicate only through the bus, enabling the plugin host's core thesis (doc 17).
- **Deterministic replay** from any checkpoint, because the input log captures every state-changing communication.
- **AI-tunable gameplay** via command injection through the WebSocket (doc 22): the AI issues a command, the bus dispatches it, the sim state changes.
- **Atomic multi-plugin updates** via transactions, so combat, economy, and diplomacy can update multiple plugins without inconsistent intermediates.
- **The branching-save system** (doc 11), which forks the input log at a chosen tick and replays from there.

The event bus is the engine's nervous system. With it specified, every plugin can be written against a stable, deterministic communication fabric that survives save/load, cross-browser replay, and AI-driven stress testing.
