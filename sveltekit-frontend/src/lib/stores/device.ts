import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Persistent TV store
const initialValue = browser ? (localStorage.getItem('tv-mode-enabled') === 'true') : false;
export const isTV = writable(initialValue);

if (browser) {
  isTV.subscribe(value => {
    localStorage.setItem('tv-mode-enabled', value.toString());
    if (value) {
      document.body.classList.add('tv-mode');
    } else {
      document.body.classList.remove('tv-mode');
    }
  });

  const detectTV = () => {
    // Only auto-detect if not manually set in localStorage yet
    if (localStorage.getItem('tv-mode-enabled') !== null) return;

    const ua = navigator.userAgent.toLowerCase();
    const tvKeywords = [
      'smarttv', 'smart-tv', 'googletv', 'appletv', 'hbbtv', 'viera', 'tizen',
      'webos', 'playstation', 'xbox', 'roku', 'firetv', 'nettv', 'mibox',
      'chromecast', 'androidtv', 'animeprotv'
    ];
    
    const isTVDevice = tvKeywords.some(keyword => ua.includes(keyword)) || 
                       // @ts-ignore
                       (window.Capacitor?.isNativePlatform?.() && ua.includes('tv'));
    
    if (isTVDevice) isTV.set(true);
  };

  detectTV();
}
