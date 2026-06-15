import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.watchanimez.app',
  appName: 'WatchAnimez',
  webDir: 'www',
  
  // Load the remote Vercel-hosted frontend
  server: {
    url: 'https://watchanimez.me',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: ['*'],
  },

  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0a',
    webContentsDebuggingEnabled: false,
  },
};

export default config;
