import { scrollbarCss } from './scrollbar';

const COLORS = { track: '#0a0a12', from: '#7c3aed', to: '#2563eb', hover: '#22d3ee' };

describe('scrollbarCss', () => {
  it('uses the track colour for the track, the corner and the thumb inset', () => {
    const css = scrollbarCss(COLORS);
    expect(css).toContain('*::-webkit-scrollbar-track {\n  background: #0a0a12;');
    expect(css).toContain('*::-webkit-scrollbar-corner {\n  background: #0a0a12;');
    expect(css).toContain('border: 3px solid #0a0a12;');
  });

  it('draws a 12 px pill thumb that runs from violet to blue', () => {
    const css = scrollbarCss(COLORS);
    expect(css).toContain('width: 12px;');
    expect(css).toContain('border-radius: 999px;');
    expect(css).toContain('linear-gradient(180deg, #7c3aed, #2563eb)');
    expect(css).toContain('linear-gradient(90deg, #7c3aed, #2563eb)');
  });

  it('moves the thumb to the brighter end on hover', () => {
    const css = scrollbarCss(COLORS);
    expect(css).toContain(
      '*::-webkit-scrollbar-thumb:vertical:hover {\n  background: linear-gradient(180deg, #7c3aed, #22d3ee);',
    );
  });

  it('keeps a thin coloured scrollbar only for browsers without webkit scrollbars', () => {
    const css = scrollbarCss(COLORS);
    expect(css).toContain('@supports not selector(::-webkit-scrollbar)');
    expect(css).toContain('scrollbar-color: #2563eb #0a0a12;');
    expect(css.indexOf('scrollbar-color')).toBeGreaterThan(css.indexOf('@supports'));
  });

  it('changes with the colours of the theme', () => {
    const light = scrollbarCss({ ...COLORS, track: '#ffffff' });
    expect(light).toContain('border: 3px solid #ffffff;');
    expect(light).not.toContain('#0a0a12');
  });
});
