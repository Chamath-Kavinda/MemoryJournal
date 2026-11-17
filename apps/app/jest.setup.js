/* global window */
// React Native's jest setup creates a `window` object but no `matchMedia`.
// Reanimated's web ReducedMotion module calls `window.matchMedia(...)` as soon
// as it is imported, so on a runner that resolves that file (the CI Linux
// runner does) every test that imports an animated component fails to load.
// A no-op that reports "no reduced-motion preference" is enough for tests.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: String(query),
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
