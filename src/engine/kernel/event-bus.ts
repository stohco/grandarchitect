/**
 * Event Bus
 *
 * Typed events, commands, queries, and transactions.
 * Synchronous dispatch within a tick. No re-entrancy.
 * Events are serializable (part of the input log for determinism replay).
 */

import type { EngineEvent, EngineCommand, EngineQuery, Tick, Transaction, Result } from './types';

type EventHandler = (event: EngineEvent) => void;
type CommandHandler = (command: EngineCommand) => Result<void>;
type QueryHandler = (query: EngineQuery) => Result<unknown>;

export interface EventBus {
  // Events (fire-and-forget, synchronous within tick)
  emit(event: EngineEvent): void;
  on(type: string, handler: EventHandler): () => void;
  off(type: string, handler: EventHandler): void;

  // Commands (request state change, returns success/failure)
  registerCommand(type: string, handler: CommandHandler): () => void;
  command(cmd: EngineCommand): Result<void>;

  // Queries (read-only, returns result)
  registerQuery(type: string, handler: QueryHandler): () => void;
  query(q: EngineQuery): Result<unknown>;

  // Transactions (atomic state changes)
  beginTransaction(): Transaction;
  commitTransaction(tx: Transaction): Result<void>;
  abortTransaction(tx: Transaction): void;

  // Input log (for determinism replay)
  getInputLog(): EngineEvent[];
  clearInputLog(): void;

  // Get pending events for this tick (processed in step 5 of frame loop)
  drainPending(): EngineEvent[];
}

export function createEventBus(): EventBus {
  const eventHandlers = new Map<string, Set<EventHandler>>();
  const commandHandlers = new Map<string, CommandHandler>();
  const queryHandlers = new Map<string, QueryHandler>();
  const inputLog: EngineEvent[] = [];
  const pending: EngineEvent[] = [];
  let transactionCounter = 0n;

  return {
    emit(event) {
      // Add to input log (for determinism replay)
      inputLog.push(event);
      // Add to pending queue (processed in step 5 of frame loop)
      pending.push(event);
    },

    on(type, handler) {
      if (!eventHandlers.has(type)) {
        eventHandlers.set(type, new Set());
      }
      eventHandlers.get(type)!.add(handler);
      return () => this.off(type, handler);
    },

    off(type, handler) {
      eventHandlers.get(type)?.delete(handler);
    },

    registerCommand(type, handler) {
      commandHandlers.set(type, handler);
      return () => commandHandlers.delete(type);
    },

    command(cmd) {
      const handler = commandHandlers.get(cmd.type);
      if (!handler) {
        return { ok: false, error: `No handler for command: ${cmd.type}` };
      }
      return handler(cmd);
    },

    registerQuery(type, handler) {
      queryHandlers.set(type, handler);
      return () => queryHandlers.delete(type);
    },

    query(q) {
      const handler = queryHandlers.get(q.type);
      if (!handler) {
        return { ok: false, error: `No handler for query: ${q.type}` };
      }
      return handler(q);
    },

    beginTransaction() {
      const tx: Transaction = {
        id: ++transactionCounter,
        readSet: new Set(),
        writeSet: new Map(),
        status: 'pending',
      };
      return tx;
    },

    commitTransaction(tx) {
      if (tx.status !== 'pending') {
        return { ok: false, error: `Transaction ${tx.id} is not pending (status: ${tx.status})` };
      }
      // In a full implementation, this would check for conflicts with other transactions.
      // For now, we just mark as committed.
      tx.status = 'committed';
      return { ok: true, value: undefined };
    },

    abortTransaction(tx) {
      tx.status = 'aborted';
    },

    getInputLog() {
      return [...inputLog];
    },

    clearInputLog() {
      inputLog.length = 0;
    },

    drainPending() {
      const events = [...pending];
      pending.length = 0;

      // Dispatch synchronously
      for (const event of events) {
        const handlers = eventHandlers.get(event.type);
        if (handlers) {
          for (const handler of handlers) {
            handler(event);
          }
        }
      }

      return events;
    },
  };
}
