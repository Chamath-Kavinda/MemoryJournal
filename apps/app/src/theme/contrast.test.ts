import { AA_TEXT, contrastRatio } from './contrast';
import { DARK_PALETTE, LIGHT_PALETTE, type Palette } from './palette';

describe('contrastRatio', () => {
  it('gives 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('does not depend on the order of the colours', () => {
    expect(contrastRatio('#0a60d6', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#0a60d6'),
      10,
    );
  });

  it('rejects colours that are not #rrggbb', () => {
    expect(() => contrastRatio('red', '#ffffff')).toThrow();
  });
});

/** Every pair of colours the screens actually draw text with. */
function textPairs(p: Palette): [string, string, string][] {
  return [
    ['text on background', p.text, p.background],
    ['text on surface', p.text, p.surface],
    ['muted on background', p.muted, p.background],
    ['muted on surface', p.muted, p.surface],
    ['accent on background', p.accent, p.background],
    ['accent on surface', p.accent, p.surface],
    ['danger on background', p.danger, p.background],
    ['danger on surface', p.danger, p.surface],
    ['onAccent on accent', p.onAccent, p.accent],
  ];
}

describe.each([
  ['light', LIGHT_PALETTE],
  ['dark', DARK_PALETTE],
])('%s palette', (_name, palette) => {
  it.each(textPairs(palette))('%s meets WCAG AA (4.5:1)', (_pair, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
