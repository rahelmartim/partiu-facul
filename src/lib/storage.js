// A small JSON store on top of a Web Storage object (localStorage,
// sessionStorage, or the in-memory version below for tests).

const PREFIX = "partiufacul:";

export function createStore(backend = memoryStorage()) {
  return {
    get(key, fallback = null) {
      const raw = backend.getItem(PREFIX + key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        // Broken data, for example after a manual edit: use the fallback.
        return fallback;
      }
    },
    set(key, value) {
      backend.setItem(PREFIX + key, JSON.stringify(value));
    },
    remove(key) {
      backend.removeItem(PREFIX + key);
    },
    /** Applies fn to the current value and saves the result. */
    update(key, fallback, fn) {
      const next = fn(this.get(key, fallback));
      this.set(key, next);
      return next;
    },
    /** Removes every key of this app. */
    clear() {
      const keys = [];
      for (let i = 0; i < backend.length; i++) {
        const key = backend.key(i);
        if (key?.startsWith(PREFIX)) keys.push(key);
      }
      keys.forEach((key) => backend.removeItem(key));
    },
  };
}

/** An in-memory object with the Web Storage interface. */
export function memoryStorage() {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  };
}
