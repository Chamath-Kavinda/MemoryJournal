/**
 * Motion tokens (section 4 of the v0.2.5 plan, which replaces section 15.16). Every timing and
 * delay used by an animation lives here; screens and components never invent their own numbers.
 *
 * From v0.2.5 nothing changes its position, size or angle as an animation, so there are no
 * spring, scale or distance tokens. Only opacity, color, drawn strokes, filled bars and counting
 * numbers animate.
 */

/** Durations in milliseconds. */
export const DURATION = {
  /** What every transition becomes when the system asks for reduced motion. */
  reduced: 100,
  /** Presses, toggles, dialogs, sheets and screen fades. */
  fast: 150,
  /** Most transitions, and the theme cross-fade. */
  base: 250,
  /** Screen entrances. */
  slow: 400,
  /** The score ring and the trend line. */
  hero: 900,
} as const;

/** Cubic bezier control points: ease-out for things entering, ease-in for things leaving. */
export const EASE_OUT = [0, 0, 0.2, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

/** Lists stagger by 50 ms per item, for at most 8 items; the rest appear together. Fade only. */
export const STAGGER_STEP = 50;
export const STAGGER_MAX_ITEMS = 8;

/** At most two looping animations are visible at the same time. */
export const MAX_LOOPS = 2;

/** Half cycle of a looping animation, in milliseconds. */
export const LOOP_DURATION = {
  breathe: 1400,
  shimmer: 900,
} as const;

/**
 * The delay before list item `index` (0 based) starts to enter. Items past the eighth use the
 * delay of the eighth, so a long list is not slow to appear.
 */
export function staggerDelay(index: number): number {
  const safe = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return Math.min(safe, STAGGER_MAX_ITEMS - 1) * STAGGER_STEP;
}

/** The brand splash shows for at least 500 ms and at most 3 seconds, then fades out over 200 ms (section 15.5). */
export const SPLASH_MIN_MS = 500;
export const SPLASH_MAX_MS = 3000;
export const SPLASH_FADE_MS = 200;
