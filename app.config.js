/**
 * App config dinámico según perfil de build
 * 
 * Perfiles definidos en eas.json:
 * - dev:     "Closetly Dev"  (com.closetly.app.dev)  → canal preview
 * - preview: "Closetly"      (com.closetly.app)       → canal preview (tu APK actual)
 * - production: "Closetly"   (com.closetly.app)       → canal production
 */

const APP_NAME = process.env.APP_NAME || 'Closetly';
const PACKAGE_NAME = process.env.ANDROID_PACKAGE || 'com.closetly.app';
const BUNDLE_ID = process.env.IOS_BUNDLE_ID || 'com.closetly.app';

export default {
  expo: {
    name: APP_NAME,
    slug: 'closetly-virtualcloset',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#62D9C7',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSFaceIDUsageDescription:
          'Usa Face ID o huella digital para iniciar sesión rápidamente en Closetly',
      },
    },
    android: {
      package: PACKAGE_NAME,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#62D9C7',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-localization',
      'expo-secure-store',
      'expo-local-authentication',
      [
        'expo-notifications',
        {
          color: '#62D9C7',
        },
      ],
    ],
    scheme: 'closetly',
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: 'c694e446-16cc-4d93-a03c-9eef1d7bc6be',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/c694e446-16cc-4d93-a03c-9eef1d7bc6be',
    },
  },
};
