const KEYS = {
  UI_STATE__USERNAME: "UI_STATE__USERNAME",
} as const;

type Key = (typeof KEYS)[keyof typeof KEYS];

export const STORAGE = {
  KEYS,

  get(key: Key) {
    return localStorage.getItem(key) ?? undefined;
  },

  set(key: Key, value: string) {
    localStorage.setItem(key, value);
  },
};
