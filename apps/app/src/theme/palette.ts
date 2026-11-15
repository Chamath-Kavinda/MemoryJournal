import type { ThemePreference } from '@memory-journal/core';

export type Scheme = 'light' | 'dark';

export interface Palette {
  background: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
  accent: string;
  onAccent: string;
  danger: string;
}

export const LIGHT_PALETTE: Palette = {
  background: '#ffffff',
  text: '#1c1c1e',
  muted: '#6c6c70',
  border: '#d1d1d6',
  surface: '#f2f2f7',
  accent: '#0a60d6',
  onAccent: '#ffffff',
  danger: '#d70015',
};

// Every text pair of both palettes is checked against WCAG AA (4.5:1) in contrast.test.ts. A
// light accent is needed to read on dark surfaces, and dark text then reads best on top of it.
export const DARK_PALETTE: Palette = {
  background: '#121214',
  text: '#f2f2f2',
  muted: '#a1a1a6',
  border: '#3a3a3c',
  surface: '#2c2c2e',
  accent: '#4da3ff',
  onAccent: '#000000',
  danger: '#ff6961',
};

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
