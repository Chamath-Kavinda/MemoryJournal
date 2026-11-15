import type { ThemePreference } from '@memory-journal/core';

import { DARK_TOKENS, LIGHT_TOKENS, ON_GRADIENT, type Tokens } from './tokens';

export type Scheme = 'light' | 'dark';

/**
 * What screens draw with: the design tokens plus the names the screens already use. The older
 * names are kept so screens can move to the token names one by one as they are redesigned.
 */
export interface Palette extends Tokens {
  /** Same as `bg`. */
  background: string;
  /** Same as `textMuted`. */
  muted: string;
  /** Colour of controls and links: `neonViolet`. */
  accent: string;
  /** Text drawn on top of `accent`. */
  onAccent: string;
  /** Text drawn on the brand gradient. */
  onGradient: string;
}

function paletteFromTokens(tokens: Tokens, onAccent: string): Palette {
  return {
    ...tokens,
    background: tokens.bg,
    muted: tokens.textMuted,
    accent: tokens.neonViolet,
    onAccent,
    onGradient: ON_GRADIENT,
  };
}

// Every text pair of both palettes is checked against WCAG AA (4.5:1) in contrast.test.ts. On
// the dark theme the accent is light, so dark text reads best on top of it; on the light theme
// the accent is deep, so white text does.
export const LIGHT_PALETTE: Palette = paletteFromTokens(LIGHT_TOKENS, '#FFFFFF');
export const DARK_PALETTE: Palette = paletteFromTokens(DARK_TOKENS, DARK_TOKENS.bg);

/** The theme a person gets until they choose one: dark (section 2, decision 8). */
export const DEFAULT_THEME: ThemePreference = 'dark';

/**
 * The scheme to draw with. "system" follows the device, which may report nothing, in which case
 * the light scheme is used.
 */
export function resolveScheme(
  preference: ThemePreference,
  system: 'light' | 'dark' | null | undefined,
): Scheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function paletteFor(scheme: Scheme): Palette {
  return scheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

/** Widths from which the desktop layout (side navigation, centred content) is used. */
export const WIDE_BREAKPOINT = 900;

/** The widest the main content grows, so lines of text stay readable on large windows. */
export const CONTENT_MAX_WIDTH = 720;

export function isWide(width: number): boolean {
  return width >= WIDE_BREAKPOINT;
}
