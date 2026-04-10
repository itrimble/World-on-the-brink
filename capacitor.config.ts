import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worldonthebrink.app',
  appName: 'World on the Brink',
  webDir: 'dist',
  server: {
    // In production, the app loads from the local dist/ bundle.
    // Uncomment the line below during development to live-reload from Vite:
    // url: 'http://YOUR_LOCAL_IP:5173',
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#0a0e1a',
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0e1a',
      showSpinner: true,
      spinnerColor: '#4a9eff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0a0e1a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
