import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { ICON_SIZE } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';

/** Stroke widths: 2 normally, 2.5 for an active tab (section 15.8). */
export const STROKE = { normal: 2, active: 2.5 } as const;

export interface IconProps {
  /** A Lucide icon, for example `Flame`. */
  icon: LucideIcon;
  /** `inline` (20), `control` (24), `empty` (48), or a number of pixels. */
  size?: keyof typeof ICON_SIZE | number;
  /** A colour from the palette; the text colour when it is not given. */
  color?: string;
  strokeWidth?: number;
  /**
   * Say what the icon means when it stands alone. Without a label the icon is decorative and
   * hidden from screen readers, because the text next to it already says everything.
   */
  accessibilityLabel?: string;
}

/** One place that sizes, colours and labels every icon of the app. */
export function Icon({
  icon: Glyph,
  size = 'inline',
  color,
  strokeWidth = STROKE.normal,
  accessibilityLabel,
}: IconProps) {
  const { palette } = useTheme();
  const pixels = typeof size === 'number' ? size : ICON_SIZE[size];
  const labelled = accessibilityLabel !== undefined;
  return (
    <View
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
    >
      <Glyph size={pixels} color={color ?? palette.text} strokeWidth={strokeWidth} />
    </View>
  );
}
