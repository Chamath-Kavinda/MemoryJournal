import { Platform } from 'react-native';

/** Spacing on a 4-point grid (section 15.7). */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Radius 12 for inputs and chips, 16 for cards, 24 for sheets and dialogs, fully round for pills. */
export const RADIUS = {
  input: 12,
  chip: 12,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

/** Borders are 1 px. */
export const BORDER_WIDTH = 1;

/** Icon sizes: 20 inline, 24 in buttons and tabs, 48 in empty states (40 to 56 is allowed). */
export const ICON_SIZE = {
  inline: 20,
  control: 24,
  empty: 48,
} as const;

/** Touch targets are at least 44 by 44, and 48 on Android. */
export function minTargetFor(os: string): number {
  return os === 'android' ? 48 : 44;
}

export const MIN_TARGET = minTargetFor(Platform.OS);
