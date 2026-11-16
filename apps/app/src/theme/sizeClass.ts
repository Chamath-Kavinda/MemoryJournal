import { WIDE_BREAKPOINT } from './palette';

/** Window widths from which the medium layout is used (section 15.9). */
export const MEDIUM_BREAKPOINT = 600;

/** A window shorter than this is a phone held sideways, which gets a shorter bar and header. */
export const LANDSCAPE_MAX_HEIGHT = 500;

/** Widest the main content grows in each size class, so lines of text stay readable. */
export const MEDIUM_CONTENT_MAX_WIDTH = 720;
export const EXPANDED_CONTENT_MAX_WIDTH = 960;

/**
 * The largest a calendar date cell gets. Cells are a seventh of the width they share, which is
 * 40 or more on every phone from 360 wide, and the grid stops growing at seven of these.
 */
export const CALENDAR_CELL_MAX = 56;

/** Compact is below 600, medium is 600 to 899 and expanded is 900 and above. */
export type SizeClass = 'compact' | 'medium' | 'expanded';

/** What a screen needs to know about the window it is drawn in. */
export interface Layout {
  sizeClass: SizeClass;
  /** Width the main content is limited to. */
  contentMaxWidth: number;
  /** How many columns a list of cards uses at most: one, two or three. */
  columns: 1 | 2 | 3;
  /** True for a phone in landscape: bars and headers shrink. */
  shortScreen: boolean;
}

export function sizeClassFor(width: number): SizeClass {
  if (width >= WIDE_BREAKPOINT) return 'expanded';
  if (width >= MEDIUM_BREAKPOINT) return 'medium';
  return 'compact';
}

/**
 * The layout for a window size. It looks only at the window, never at a device model, so
 * rotation, split screen, foldables and a resized desktop window all update it.
 */
export function layoutFor(width: number, height: number): Layout {
  const sizeClass = sizeClassFor(width);
  return {
    sizeClass,
    contentMaxWidth:
      sizeClass === 'expanded' ? EXPANDED_CONTENT_MAX_WIDTH : MEDIUM_CONTENT_MAX_WIDTH,
    columns: sizeClass === 'compact' ? 1 : sizeClass === 'medium' ? 2 : 3,
    shortScreen: height < LANDSCAPE_MAX_HEIGHT,
  };
}

/** The number of columns for a list whose cards are too wide for more than `most` columns. */
export function columnsFor(layout: Layout, most: 1 | 2 | 3): 1 | 2 | 3 {
  return Math.min(layout.columns, most) as 1 | 2 | 3;
}

/** Splits items into rows of `columns`, the last row possibly shorter. */
export function chunkRows<T>(items: readonly T[], columns: number): T[][] {
  const size = Math.max(1, Math.floor(columns));
  const rows: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    rows.push(items.slice(start, start + size));
  }
  return rows;
}
