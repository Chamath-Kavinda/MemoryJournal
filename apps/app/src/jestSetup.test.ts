// Guards the jest setup file: Reanimated's web ReducedMotion module calls
// window.matchMedia on import, and React Native's test window does not have it.
describe('jest setup', () => {
  it('defines window.matchMedia with no reduced-motion preference', () => {
    expect(typeof window.matchMedia).toBe('function');
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
  });
});
