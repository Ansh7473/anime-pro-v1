import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Persistent TV store
const getInitialTVState = () => {
  if (!browser) return false;
  const ua = navigator.userAgent.toLowerCase();
  
  // High-priority native wrapper detection
  if (ua.includes('animeprotv')) return true;
  
  // Saved preference
  const saved = localStorage.getItem('tv-mode-enabled');
  if (saved !== null) return saved === 'true';

  // Standard auto-detection
  const tvKeywords = [
    'smarttv', 'smart-tv', 'googletv', 'appletv', 'hbbtv', 'viera', 'tizen',
    'webos', 'playstation', 'xbox', 'roku', 'firetv', 'nettv', 'mibox',
    'chromecast', 'androidtv'
  ];
  const isTVDevice = tvKeywords.some(keyword => ua.includes(keyword)) || 
         // @ts-ignore
         !!(window.Capacitor?.isNativePlatform?.() && ua.includes('tv'));
  return isTVDevice;
};

export const isTV = writable(getInitialTVState());

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
    const ua = navigator.userAgent.toLowerCase();
    
    // Always keep forced if native wrapper
    if (ua.includes('animeprotv')) {
      isTV.set(true);
      return;
    }
    
    // Auto-detect only if no manual preference exists
    if (localStorage.getItem('tv-mode-enabled') !== null) return;

    const tvKeywords = [
      'smarttv', 'smart-tv', 'googletv', 'appletv', 'hbbtv', 'viera', 'tizen',
      'webos', 'playstation', 'xbox', 'roku', 'firetv', 'nettv', 'mibox',
      'chromecast', 'androidtv'
    ];
    
    const isTVDevice = tvKeywords.some(keyword => ua.includes(keyword)) || 
                       // @ts-ignore
                       (window.Capacitor?.isNativePlatform?.() && ua.includes('tv'));
    
    if (isTVDevice) isTV.set(true);
  };

  detectTV();
}
