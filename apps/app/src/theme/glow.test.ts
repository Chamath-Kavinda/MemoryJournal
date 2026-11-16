import { glowStyle } from './glow';
import { DARK_TOKENS, LIGHT_SHADOW } from './tokens';

describe('glowStyle', () => {
  it('draws a neon glow in the given colour on the dark theme', () => {
    const style = glowStyle(DARK_TOKENS.neonViolet, 'dark', 10, 'ios');
    expect(style.boxShadow).toBe(`0 0 10px ${DARK_TOKENS.neonViolet}99`);
  });

  it('uses the soft violet shadow instead of a glow on the light theme', () => {
    const style = glowStyle('#000000', 'light', 10, 'web');
    expect(style.boxShadow).toBe(`0 2px 10px ${LIGHT_SHADOW}`);
  });

  it('draws nothing on Android in either theme', () => {
    expect(glowStyle(DARK_TOKENS.neonViolet, 'dark', 12, 'android')).toEqual({});
    expect(glowStyle(DARK_TOKENS.neonViolet, 'light', 12, 'android')).toEqual({});
  });
});
