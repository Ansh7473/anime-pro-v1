import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animepro.ultra',
  appName: 'AnimePro Ultra',
  webDir: 'build',
  server: {
    url: 'https://anime-pro-v1-frontend.vercel.app/',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0a'
  }
};

export default config;
