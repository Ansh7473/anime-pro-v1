import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animepro.ultra.tv',
  appName: 'AnimePro TV',
  webDir: 'www',
  server: {
    // Point this to your hosted web app URL
    url: 'https://anime-pro-v1-frontend.vercel.app/tv',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0a'
  }
};

export default config;
