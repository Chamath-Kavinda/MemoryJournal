/**
 * Design tokens (section 15.7). Every colour of the app comes from here; screens never write a
 * hex value. The names are the same in both themes. In the light theme the "neon" colours are
 * the darker accents, so icons and active states stay readable on white.
 */
export interface Tokens {
  /** Screen background. */
  bg: string;
  /** Cards. */
  surface: string;
  /** Inputs, selected rows and dialogs. */
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  /** The brand gradient runs from primaryStart to primaryEnd, with white text on top. */
  primaryStart: string;
  primaryEnd: string;
  /** Icons, active states, focus rings and gradient borders. */
  neonViolet: string;
  neonBlue: string;
  neonCyan: string;
  /** Rare highlights such as milestones. */
  neonPink: string;
  success: string;
  warning: string;
  danger: string;
}

/** Near black with a blue tint, the default theme. */
export const DARK_TOKENS: Tokens = {
  bg: '#07070D',
  surface: '#0F0F1A',
  surfaceRaised: '#171728',
  border: '#26264A',
  text: '#F4F4FF',
  textMuted: '#A3A3C7',
  primaryStart: '#7C3AED',
  primaryEnd: '#2563EB',
  neonViolet: '#A78BFA',
  neonBlue: '#60A5FA',
  neonCyan: '#22D3EE',
  neonPink: '#E879F9',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',
};

/** The same brand gradient on a soft lavender white. */
export const LIGHT_TOKENS: Tokens = {
  bg: '#F7F6FF',
  surface: '#FFFFFF',
  surfaceRaised: '#EFEDFF',
  border: '#DDD8F5',
  text: '#14122B',
  textMuted: '#5B5880',
  primaryStart: '#7C3AED',
  primaryEnd: '#2563EB',
  neonViolet: '#6D28D9',
  neonBlue: '#1D4ED8',
  neonCyan: '#0E7490',
  // Section 15.7 suggests #C026D3, which measures 4.39:1 on bg, just under AA, so it is darkened.
  neonPink: '#B81FCB',
  success: '#047857',
  warning: '#B45309',
  danger: '#BE123C',
};

/** Colour of the text drawn on the brand gradient, in both themes. */
export const ON_GRADIENT = '#FFFFFF';

/** The splash is always dark, whichever theme is saved (section 15.5). */
export const SPLASH_BACKGROUND = DARK_TOKENS.bg;

/** The dimming layer behind a dialog. The same in both themes, so the page stays readable under it. */
export const SCRIM = 'rgba(3, 3, 8, 0.7)';

/** Gradients run at 135 degrees, from the top left corner to the bottom right. */
export const GRADIENT_START = { x: 0, y: 0 } as const;
export const GRADIENT_END = { x: 1, y: 1 } as const;
