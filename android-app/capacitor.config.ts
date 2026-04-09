import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animepro.app',
  appName: 'AnimePro',
  webDir: 'www',
  
  // Load the remote Vercel-hosted frontend
  server: {
    url: 'https://anime-pro-v1-frontend.vercel.app',
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
