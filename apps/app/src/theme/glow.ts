import { Platform, type ViewStyle } from 'react-native';

import type { Scheme } from './palette';
import { LIGHT_SHADOW } from './tokens';

/**
 * The soft glow around active items (section 15.7).
 *
 * Dark theme: a neon glow in `color`, drawn only where the platform renders it well (web, Windows
 * and iOS). Android gets none, because its coloured shadows look muddy; the gradient border and
 * the tinted background carry the look there.
 * Light theme: no glow, a soft violet shadow instead.
 */
export function glowStyle(
  color: string,
  scheme: Scheme,
  radius = 12,
  os: string = Platform.OS,
): ViewStyle {
  if (os === 'android') return {};
  if (scheme === 'light') return { boxShadow: `0 2px ${radius}px ${LIGHT_SHADOW}` };
  // "99" is the alpha of an 8 digit hex colour, about 60 percent.
  return { boxShadow: `0 0 ${radius}px ${color}99` };
}
