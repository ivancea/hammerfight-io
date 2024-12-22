const KEYS = {
  UI_STATE__USERNAME: "UI_STATE__USERNAME",
  UI_STATE__INPUT_HANDLER_ID: "UI_STATE__INPUT_HANDLER_ID",
  UI_STATE__WEAPON: "UI_STATE__WEAPON",
  UI_STATE__BOTS: "UI_STATE__BOTS",
  UI_STATE__DEBUG_MODE: "UI_STATE__DEBUG_MODE",
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
