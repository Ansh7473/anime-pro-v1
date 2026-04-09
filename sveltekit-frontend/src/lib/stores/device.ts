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
                       // @ts-ignore
                       (window.Capacitor?.isNativePlatform?.() && ua.includes('tv'));
    
    isTV.set(isTVDevice);
    
    if (isTVDevice) {
      document.body.classList.add('tv-mode');
    }
  };

  detectTV();
}
