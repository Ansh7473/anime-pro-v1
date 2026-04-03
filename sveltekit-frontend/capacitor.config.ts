import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rusty.app',
  appName: 'ANIME PRO',
  webDir: 'build',
  server: {
    url: 'https://anime-pro-v1-frontend.vercel.app/',
    cleartext: true
  }
};

export default config;
