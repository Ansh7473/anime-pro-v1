import { writable } from 'svelte/store';

// Persist selected theme in localStorage
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedTheme') : null;
export const theme = writable<string>(stored ?? 'minimalist');

// Apply theme class to <html> and persist changes
theme.subscribe((value) => {
  if (typeof document !== 'undefined') {
    document.documentElement.className = `theme-${value}`;
    localStorage.setItem('selectedTheme', value);
  }
});
