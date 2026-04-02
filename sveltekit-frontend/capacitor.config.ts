import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.animepro.app',
  appName: 'AnimePro',
  webDir: 'build',
  server: {
    androidScheme: 'capacitor',
    hostname: 'localhost'
  }
};

export default config;
