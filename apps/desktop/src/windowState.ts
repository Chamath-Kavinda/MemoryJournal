import { readFileSync, writeFileSync } from 'node:fs';

/** Smallest window the layouts are designed for (section 15.9). */
export const MIN_WIDTH = 480;
export const MIN_HEIGHT = 640;
export const DEFAULT_WIDTH = 1100;
export const DEFAULT_HEIGHT = 760;

/** Window background; matches the dark `bg` token so there is no white flash (section 15.5). */
export const WINDOW_BACKGROUND = '#07070D';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  width: number;
  height: number;
  /** Position is only kept when it is still on a connected display. */
  x?: number;
  y?: number;
  maximized: boolean;
}

export const DEFAULT_STATE: WindowState = {
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  maximized: false,
};

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** True when at least a usable part of the window sits inside one of the displays. */
function isVisible(rect: Rect, displays: Rect[]): boolean {
  const MARGIN = 80;
  return displays.some(
    (d) =>
      rect.x + rect.width - MARGIN > d.x &&
      rect.x + MARGIN < d.x + d.width &&
      rect.y + MARGIN / 2 > d.y &&
      rect.y < d.y + d.height - MARGIN / 2,
  );
}

/**
 * Turns whatever was read from disk into a safe state: never below the minimum size, never
 * larger than the biggest display, and without a position if the old display is gone.
 */
export function sanitizeState(raw: unknown, displays: Rect[]): WindowState {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_STATE };
  const input = raw as Record<string, unknown>;
  const maxWidth = Math.max(MIN_WIDTH, ...displays.map((d) => d.width));
  const maxHeight = Math.max(MIN_HEIGHT, ...displays.map((d) => d.height));

  const width = isNumber(input.width)
    ? Math.min(Math.max(Math.round(input.width), MIN_WIDTH), maxWidth)
    : DEFAULT_WIDTH;
  const height = isNumber(input.height)
    ? Math.min(Math.max(Math.round(input.height), MIN_HEIGHT), maxHeight)
    : DEFAULT_HEIGHT;

  const state: WindowState = { width, height, maximized: input.maximized === true };
  if (isNumber(input.x) && isNumber(input.y)) {
    const x = Math.round(input.x);
    const y = Math.round(input.y);
    if (isVisible({ x, y, width, height }, displays)) {
      state.x = x;
      state.y = y;
    }
  }
  return state;
}

export function loadWindowState(file: string, displays: Rect[]): WindowState {
  try {
    return sanitizeState(JSON.parse(readFileSync(file, 'utf8')), displays);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveWindowState(file: string, state: WindowState): void {
  try {
    writeFileSync(file, JSON.stringify(state), 'utf8');
  } catch {
    // Not being able to remember the size is never worth interrupting the person.
  }
}
