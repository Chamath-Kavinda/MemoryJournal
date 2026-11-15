import { isWide, paletteFor, resolveScheme, WIDE_BREAKPOINT } from './palette';

describe('resolveScheme', () => {
  it('uses the chosen theme whatever the system says', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('follows the system when the choice is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('falls back to light when the system reports nothing', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });
});

describe('paletteFor', () => {
  it('gives each scheme its own background and text colour', () => {
    const light = paletteFor('light');
    const dark = paletteFor('dark');
    expect(light.background).not.toBe(dark.background);
    expect(light.text).not.toBe(dark.text);
  });
});

describe('isWide', () => {
  it('switches to the desktop layout at the breakpoint', () => {
    expect(isWide(WIDE_BREAKPOINT - 1)).toBe(false);
    expect(isWide(WIDE_BREAKPOINT)).toBe(true);
  });
});
