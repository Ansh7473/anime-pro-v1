import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rusty.app',
  appName: 'Rusty',
  webDir: 'dist',
  server: {
    url: 'https://anime-pro-v1-frontend.vercel.app/',
    cleartext: true
  }
};

export default config;
