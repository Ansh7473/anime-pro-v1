import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animepro.app',
  appName: 'AnimePro',
  webDir: 'www',
  
  // Load the remote Vercel-hosted frontend
  server: {
    url: 'https://anime-pro-v1-frontend.vercel.app',
    cleartext: true,
    allowNavigation: ['*'],
  },

  android: {
    // Allow mixed content (HTTP inside HTTPS)
    allowMixedContent: true,
    // Custom WebView settings
    webContentsDebuggingEnabled: false,
  },
};

export default config;
