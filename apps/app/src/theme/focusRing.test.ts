import { focusRingCss } from './focusRing';

describe('focusRingCss', () => {
  it('outlines focused controls in the given colour', () => {
    const css = focusRingCss('#0a60d6');
    expect(css).toContain('#0a60d6');
    expect(css).toContain('outline: 2px solid');
  });

  it('shows the ring for keyboard focus only', () => {
    const css = focusRingCss('#0a60d6');
    expect(css).toContain(':focus-visible');
    expect(css).not.toContain(':focus,');
  });

  it('covers links, buttons, fields and anything that can be tabbed to', () => {
    const css = focusRingCss('#000000');
    for (const selector of ['[tabindex]', 'a', 'button', 'input', 'textarea']) {
      expect(css).toContain(`${selector}:focus-visible`);
    }
  });
});
