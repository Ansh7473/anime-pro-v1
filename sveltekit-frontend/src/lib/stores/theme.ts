import { writable } from 'svelte/store';

export interface ThemeSettings {
  current: string;
  gradients: boolean;
  effect: string;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  current: 'minimalist',
  gradients: false,
  effect: 'none'
};

// Persist selected theme in localStorage
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('themeSettings') : null;
const initialSettings = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;

export const themeState = writable<ThemeSettings>(initialSettings);

// Apply settings to document and persist changes
themeState.subscribe((value) => {
  if (typeof document !== 'undefined') {
    const el = document.documentElement;
    
    // Clear old theme classes
    const classes = Array.from(el.classList).filter(c => !c.startsWith('theme-') && !c.startsWith('effect-'));
    el.className = classes.join(' ');
    
    // Add new classes & data attributes
    el.classList.add(`theme-${value.current}`);
    if (value.effect !== 'none') el.classList.add(`effect-${value.effect}`);
    
    el.setAttribute('data-gradients', value.gradients.toString());
    el.setAttribute('data-effect', value.effect);
    
    localStorage.setItem('themeSettings', JSON.stringify(value));
  }
});

// For backward compatibility during migration, we can export a derived store or a helper
// But it's better to update all consumers to use themeState
