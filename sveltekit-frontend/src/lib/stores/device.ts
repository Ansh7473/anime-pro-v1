import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const isTV = writable(false);

if (browser) {
  const detectTV = () => {
    const ua = navigator.userAgent.toLowerCase();
    const tvKeywords = [
      'smarttv', 'smart-tv', 'googletv', 'appletv', 'hbbtv', 'viera', 'tizen',
      'webos', 'playstation', 'xbox', 'roku', 'firetv', 'nettv', 'mibox',
      'chromecast', 'androidtv'
    ];
    
    const isTVDevice = tvKeywords.some(keyword => ua.includes(keyword)) || 
                      (window.innerWidth >= 1920 && !('ontouchstart' in window));
    
    isTV.set(isTVDevice);
    
    if (isTVDevice) {
      document.body.classList.add('tv-mode');
    }
  };

  detectTV();
  
  // Also listen for key events to enable TV mode if remote is used
  const enableTVOnKey = (e: KeyboardEvent) => {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
    if (keys.includes(e.key)) {
      isTV.set(true);
      document.body.classList.add('tv-mode');
      window.removeEventListener('keydown', enableTVOnKey);
    }
  };
  
  window.addEventListener('keydown', enableTVOnKey);
}
