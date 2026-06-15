import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jztradehub.app',
  appName: 'JZTradeHub',
  webDir: 'dist',
  server: {
    // For development on real device - use your network IP
    url: 'http://192.168.190.172:8083',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: true
  }
};

export default config;