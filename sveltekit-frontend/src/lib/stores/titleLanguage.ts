import { writable } from "svelte/store";

export type TitleLanguage = "english" | "japanese";

const STORAGE_KEY = "watchanimex.titleLanguage";
const preference = writable<TitleLanguage>("english");
let initialized = false;

function isTitleLanguage(value: unknown): value is TitleLanguage {
  return value === "english" || value === "japanese";
}

function persist(value: TitleLanguage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

export const titleLanguage = {
  subscribe: preference.subscribe,
  initialize() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isTitleLanguage(stored)) preference.set(stored);
    } catch {
      // Keep the English default when storage cannot be read.
    }
  },
  set(value: TitleLanguage) {
    preference.set(value);
    persist(value);
  },
};
