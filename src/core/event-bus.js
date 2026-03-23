/**
 * Central event bus — all game events flow through here.
 * No module calls another module directly.
 *
 *   GAME ENGINE ──emit──▶ EVENT BUS ──distribute──▶ SUBSCRIBERS
 *       │                     │
 *   click ───────────────────▶│──▶ event-log (append)
 *   purchase ────────────────▶│──▶ entity/brain (evaluate)
 *   molt ────────────────────▶│──▶ entity/phases (check)
 *   session_start ───────────▶│──▶ entity/personality (update)
 */

class EventBus {
  constructor() {
    this._listeners = new Map();
    this._middlewares = [];
  }

  on(eventType, callback, priority = 0) {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, []);
    }
    this._listeners.get(eventType).push({ callback, priority });
    this._listeners.get(eventType).sort((a, b) => b.priority - a.priority);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    const listeners = this._listeners.get(eventType);
    if (!listeners) return;
    const idx = listeners.findIndex(l => l.callback === callback);
    if (idx !== -1) listeners.splice(idx, 1);
  }

  use(middleware) {
    this._middlewares.push(middleware);
  }

  emit(eventType, data = {}) {
    const event = {
      type: eventType,
      ts: new Date().toISOString(),
      ...data,
    };

    for (const mw of this._middlewares) {
      const result = mw(event);
      if (result === false) return;
    }

    const listeners = this._listeners.get(eventType) || [];
    for (const { callback } of listeners) {
      try {
        callback(event);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${eventType}":`, err);
      }
    }

    const wildcardListeners = this._listeners.get('*') || [];
    for (const { callback } of wildcardListeners) {
      try {
        callback(event);
      } catch (err) {
        console.error(`[EventBus] Error in wildcard listener:`, err);
      }
    }

    return event;
  }

  once(eventType, callback) {
    const unsub = this.on(eventType, (event) => {
      unsub();
      callback(event);
    });
    return unsub;
  }
}

module.exports = { EventBus };
