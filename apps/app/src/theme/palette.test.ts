import { DEFAULT_THEME, isWide, paletteFor, resolveScheme, WIDE_BREAKPOINT } from './palette';
import { DARK_TOKENS, LIGHT_TOKENS } from './tokens';

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

describe('default theme', () => {
  it('is dark, and the dark palette is built from the dark tokens', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(paletteFor('dark').bg).toBe(DARK_TOKENS.bg);
    expect(paletteFor('dark').accent).toBe(DARK_TOKENS.neonViolet);
    expect(paletteFor('light').bg).toBe(LIGHT_TOKENS.bg);
  });

  it('keeps the older colour names in step with the tokens', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const p = paletteFor(scheme);
      expect(p.background).toBe(p.bg);
      expect(p.muted).toBe(p.textMuted);
      expect(p.accent).toBe(p.neonViolet);
    }
  });
});
