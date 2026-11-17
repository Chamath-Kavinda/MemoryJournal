/**
 * Motion tokens (section 15.16). Every timing, spring and distance used by an animation lives
 * here; screens and components never invent their own numbers.
 */

/** Durations in milliseconds. */
export const DURATION = {
  /** What slides and scales become when the system asks for reduced motion. */
  reduced: 100,
  /** Presses and toggles. */
  fast: 150,
  /** Most transitions. */
  base: 250,
  /** Screen entrances. */
  slow: 400,
  /** The score ring and the trend line. */
  hero: 900,
} as const;

/** Cubic bezier control points: ease-out for things entering, ease-in for things leaving. */
export const EASE_OUT = [0, 0, 0.2, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

/** The one shared spring, for pops and bounces. */
export const SPRING = { damping: 15, stiffness: 180 } as const;

/** A spring with no bounce (damping ratio above 1), for a thumb that slides between choices (section 16.3). */
export const SPRING_CALM = { damping: 36, stiffness: 300 } as const;

/** Every button, tab, chip, card and icon button scales to this on press. */
export const PRESS_SCALE = 0.97;

/** A dialog scales up from this to 1 with the shared spring (section 15.16). */
export const DIALOG_ENTER_SCALE = 0.92;

/** The icon pop on selection goes 1, 1.2, 1. */
export const POP_SCALE = 1.2;

/** How far, in points, new content slides in sideways, for example a calendar changing month. */
export const SLIDE_DISTANCE = 24;

/** How far, in points, a sticky bottom bar rests below its place before it slides up. */
export const BAR_SLIDE_DISTANCE = 96;

/** A tapped date ripples from the first scale to the second while it fades out. */
export const RIPPLE_START_SCALE = 0.6;
export const RIPPLE_END_SCALE = 1.15;

/** Lists stagger by 50 ms per item, for at most 8 items; the rest appear together. */
export const STAGGER_STEP = 50;
export const STAGGER_MAX_ITEMS = 8;

/** At most two looping animations are visible at the same time. */
export const MAX_LOOPS = 2;

/** Half cycle of a looping animation, in milliseconds. */
export const LOOP_DURATION = {
  breathe: 1400,
  float: 1800,
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
