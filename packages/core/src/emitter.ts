/**
 * Minimal, dependency-free, strongly-typed event emitter.
 *
 * `EventMap` maps event names to their payload type. `on`/`once` return an
 * unsubscribe function so callers never need to keep references to the
 * original callback.
 */
export class TypedEmitter<EventMap extends Record<string, unknown>> {
  private readonly listeners: Map<keyof EventMap, Set<(payload: never) => void>>;

  constructor() {
    this.listeners = new Map();
  }

  on<K extends keyof EventMap>(
    event: K,
    cb: (payload: EventMap[K]) => void,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(cb as (payload: never) => void);
    return () => this.off(event, cb);
  }

  once<K extends keyof EventMap>(
    event: K,
    cb: (payload: EventMap[K]) => void,
  ): () => void {
    const off = this.on(event, (payload) => {
      off();
      cb(payload);
    });
    return off;
  }

  off<K extends keyof EventMap>(
    event: K,
    cb: (payload: EventMap[K]) => void,
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(cb as (payload: never) => void);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy so handlers that unsubscribe mid-emit don't mutate the iteration.
    for (const cb of [...set]) {
      (cb as (payload: EventMap[K]) => void)(payload);
    }
  }

  /** Number of registered listeners for an event (primarily for testing). */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Drop every listener. Called when a session is disposed. */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}
