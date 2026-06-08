const appJson = require('./app.json');

// Location plugin config for native builds (Android permissions, etc.)
const locationPlugin = [
  'expo-location',
  {
    locationWhenInUsePermission:
      'Closetly needs your location to suggest outfits based on the weather in your area.',
    locationAlwaysAndWhenInUsePermission:
      'Closetly needs your location to suggest outfits based on the weather in your area.',
  },
];

// Only include native plugins for non-web builds (EAS + local development)
// Vercel web build fails to resolve native plugins like expo-location
const isWebBuild = !!(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.EXPO_PUBLIC_WEB
);

if (!isWebBuild) {
  appJson.expo.plugins.push(locationPlugin);
}

module.exports = appJson;
