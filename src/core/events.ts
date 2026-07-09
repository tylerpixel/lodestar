// Typed event bus. Modules communicate through events, never imports.
// Add event names + payload types here as modules ship.
export interface AppEvents {
  'notes:changed': undefined;
  'pipeline:changed': undefined;
  'habits:changed': undefined;
  'settings:changed': undefined;
}

type EventKey = keyof AppEvents;

class EventBus {
  #handlers = new Map<EventKey, Set<(payload: unknown) => void>>();

  /** Subscribe. Returns an unsubscribe function (usable as $effect cleanup). */
  on<K extends EventKey>(event: K, fn: (payload: AppEvents[K]) => void): () => void {
    let set = this.#handlers.get(event);
    if (!set) {
      set = new Set();
      this.#handlers.set(event, set);
    }
    set.add(fn as (payload: unknown) => void);
    return () => set.delete(fn as (payload: unknown) => void);
  }

  emit<K extends EventKey>(event: K, payload?: AppEvents[K]): void {
    this.#handlers.get(event)?.forEach((fn) => fn(payload));
  }
}

export const events = new EventBus();
