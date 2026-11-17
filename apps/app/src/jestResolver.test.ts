/* eslint-disable @typescript-eslint/no-require-imports */
// Guards apps/app/jest.resolver.js. On Linux, pnpm folder names contain the text
// "react-native-worklets" (a peer-dependency suffix), and the stock resolvers
// used it to drop `.native.*` files for unrelated packages, which loaded the web
// builds of Reanimated and expo-modules-core on CI.
const resolver = require('../jest.resolver') as (
  request: string,
  options: {
    basedir: string;
    extensions?: string[];
    defaultResolver: (...args: unknown[]) => unknown;
  },
) => unknown;
const stockReanimatedResolver = require('react-native-reanimated/jest/resolver') as typeof resolver;

const EXTENSIONS = ['.ios.ts', '.native.ts', '.ts', '.native.tsx', '.tsx', '.js'];

const LINUX_PNPM_DIR =
  '/home/runner/work/MemoryJournal/MemoryJournal/node_modules/.pnpm/' +
  'react-native-reanimated@4.7.1_react-native-worklets@0.13.0_@babel+core@7.29.13/' +
  'node_modules/react-native-reanimated/src';

const EXPO_PNPM_DIR =
  '/home/runner/work/MemoryJournal/MemoryJournal/node_modules/.pnpm/' +
  'expo-modules-core@58.1.0_react-native-worklets@0.13.0_@babel+core@7.29.13/' +
  'node_modules/expo-modules-core/build';

function run(r: typeof resolver, request: string, basedir: string) {
  let seen: string[] | undefined;
  r(request, {
    basedir,
    extensions: EXTENSIONS,
    defaultResolver: (_request: unknown, opts: unknown) => {
      seen = (opts as { extensions?: string[] }).extensions;
      return '';
    },
  });
  return seen;
}

describe('jest.resolver', () => {
  it('keeps .native extensions for Reanimated files under a Linux pnpm path', () => {
    expect(run(resolver, './ReducedMotion', LINUX_PNPM_DIR)).toEqual(EXTENSIONS);
  });

  it('keeps .native extensions for other packages whose pnpm folder mentions worklets', () => {
    expect(run(resolver, './NativeViewManagerAdapter', EXPO_PNPM_DIR)).toEqual(EXTENSIONS);
  });

  it('still loads the web form of the files Reanimated lists as web-only', () => {
    const seen = run(resolver, './useAnimatedStyle', LINUX_PNPM_DIR);
    expect(seen).toEqual(['.ios.ts', '.ts', '.tsx', '.js']);
  });

  it('still drops .native extensions inside react-native-worklets itself', () => {
    const dir =
      '/home/runner/work/x/node_modules/.pnpm/react-native-worklets@0.13.0_abc/' +
      'node_modules/react-native-worklets/src';
    expect(run(resolver, './something', dir)).toEqual(['.ios.ts', '.ts', '.tsx', '.js']);
  });

  it('shows the stock resolver gets the Linux path wrong', () => {
    // If this ever stops being true, the custom resolver may no longer be needed.
    expect(run(stockReanimatedResolver, './ReducedMotion', LINUX_PNPM_DIR)).not.toEqual(EXTENSIONS);
  });
});
