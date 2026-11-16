import type { ExpoConfig } from 'expo/config';

const ALL_ARCHS = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'] as const;
type AndroidArch = (typeof ALL_ARCHS)[number];

/**
 * CPU types to build for Android. EAS profiles set ANDROID_ARCHS (comma separated).
 * Without it, all four are built so local builds and emulators keep working.
 */
function androidArchs(): AndroidArch[] {
  const raw: string = process.env.ANDROID_ARCHS ?? '';
  const requested = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (requested.length === 0) return [...ALL_ARCHS];

  const unknown = requested.filter((value) => !(ALL_ARCHS as readonly string[]).includes(value));
  if (unknown.length > 0) {
    throw new Error(`ANDROID_ARCHS contains unknown CPU type(s): ${unknown.join(', ')}`);
  }
  return requested as AndroidArch[];
}

const config: ExpoConfig = {
  name: 'Memory Journal',
  slug: 'memory-journal',
  scheme: 'memoryjournal',
  version: '0.1.0',
  // Layouts follow the window size (section 15.9), so rotation is allowed.
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.memoryjournal.app',
    // Off so a reinstall starts clean and a guest journal is never restored from a backup (D-040).
    allowBackup: false,
  },
  ios: {
    bundleIdentifier: 'com.memoryjournal.app',
  },
  web: {
    bundler: 'metro',
    favicon: './assets/icon.png',
    output: 'static',
  },
  plugins: [
    'expo-router',
    '@react-native-google-signin/google-signin',
    'expo-notifications',
    [
      'expo-build-properties',
      {
        android: {
          buildArchs: androidArchs(),
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      asyncRoutes: {
        web: true,
      },
    },
    eas: {
      projectId: '0388f7bd-c63d-4e7d-ba36-74356cbc1d45',
    },
  },
  owner: 'chamabro',
};

export default config;
