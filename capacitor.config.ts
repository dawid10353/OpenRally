import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openrally.app',
  appName: 'OpenRally',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a1e'
  }
};

export default config;
