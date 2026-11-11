// Settings of each student.

export const DEFAULT_SETTINGS = { autoConfirm: false, demoClassmates: true };

export function createSettings(store) {
  return {
    get(userId) {
      const saved = store.get("settings", {})[userId] ?? {};
      return Object.fromEntries(
        Object.entries(DEFAULT_SETTINGS).map(([key, value]) => [key, typeof saved[key] === "boolean" ? saved[key] : value]),
      );
    },
    set(userId, patch) {
      const next = { ...this.get(userId) };
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (typeof patch[key] === "boolean") next[key] = patch[key];
      }
      store.update("settings", {}, (all) => ({ ...all, [userId]: next }));
      return next;
    },
    remove(userId) {
      store.update("settings", {}, ({ [userId]: _, ...rest }) => rest);
    },
  };
}
