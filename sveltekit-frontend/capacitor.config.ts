import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.watchanimez.ultra',
  appName: 'WatchAnimez',
  webDir: 'build',
  server: {
    url: 'https://watchanimez.me/',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0a'
  }
};

export default config;
