/* global module */
// Jest resolver for the app. It replaces `react-native-reanimated/jest/resolver`,
// which in turn wraps `react-native-worklets/jest/resolver`.
//
// Both of those decide what to do by testing whether the importing file's
// directory path *contains* "react-native-reanimated" or "react-native-worklets".
// With pnpm on Linux the folder names carry peer-dependency suffixes, for
// example `react-native-reanimated@4.7.1_react-native-worklets@0.13.0_...`, so
// the test also matches Reanimated, expo-modules-core, expo-linear-gradient and
// others. Their `.native.*` files were then skipped and the web versions were
// loaded ("document is not defined", "requireNativeViewManager is not
// available"). On Windows pnpm shortens those folder names with a hash, so the
// bug only showed up on the CI runner.
//
// This version looks at the real package name (the last `node_modules/<name>`
// segment of the path) and otherwise behaves the same.

// Reanimated files that its own resolver loads in their web form under jest.
const WEB_ONLY_IN_JEST = [
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
  'useAnimatedRef',
  'useAnimatedStyle',
  'WorkletEventHandler',
  'JSPropsUpdater',
  'updateProps',
  'util',
  'css/component/AnimatedComponent',
];

function packageNameOf(dir) {
  const normalized = String(dir).replace(/\\/g, '/');
  const marker = '/node_modules/';
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return null;
  const parts = normalized.slice(index + marker.length).split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

function withoutNativeExtensions(options) {
  return {
    ...options,
    extensions: options.extensions?.filter((ext) => !ext.includes('native')),
  };
}

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const packageName = packageNameOf(options.basedir);

  if (packageName === 'react-native-reanimated' && request.startsWith('.')) {
    const basename = request.split('/').pop();
    const isWebOnly = WEB_ONLY_IN_JEST.some((entry) =>
      entry.includes('/') ? request.endsWith(entry) : basename === entry,
    );
    if (isWebOnly) {
      return options.defaultResolver(request, withoutNativeExtensions(options));
    }
  }

  if (packageName === 'react-native-worklets' || request.includes('react-native-worklets')) {
    return options.defaultResolver(request, withoutNativeExtensions(options));
  }

  return options.defaultResolver(request, options);
};
