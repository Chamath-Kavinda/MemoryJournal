import type { TextStyle } from 'react-native';

/**
 * Typography (section 15.7): Plus Jakarta Sans in weights 400, 600 and 700, bundled in the app so
 * nothing is fetched from the network.
 *
 * Custom fonts do not switch weight with `fontWeight` on Android, so every weight is registered
 * under its own family name and the family is chosen from the weight.
 */
export const FONT_FAMILY = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export type FontWeightName = keyof typeof FONT_FAMILY;

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'caption';

export interface TextVariantStyle {
  fontSize: number;
  lineHeight: number;
  weight: FontWeightName;
}

/** Sizes and line heights from section 15.7: display 28/34, title 22/28, heading 18/24, and so on. */
export const TEXT_VARIANTS: Record<TextVariant, TextVariantStyle> = {
  display: { fontSize: 28, lineHeight: 34, weight: 'bold' },
  title: { fontSize: 22, lineHeight: 28, weight: 'bold' },
  heading: { fontSize: 18, lineHeight: 24, weight: 'semibold' },
  body: { fontSize: 16, lineHeight: 24, weight: 'regular' },
  caption: { fontSize: 13, lineHeight: 18, weight: 'regular' },
};

/** The numeric CSS weight of a React Native `fontWeight` value (400 when it is not set). */
function numericWeight(weight: TextStyle['fontWeight']): number {
  if (weight === undefined || weight === 'normal') return 400;
  if (weight === 'bold') return 700;
  const parsed = Number(weight);
  return Number.isFinite(parsed) ? parsed : 400;
}

/** Which of the three bundled weights is closest to a CSS weight: below 600, 600 to 699, 700 up. */
export function fontWeightName(weight: TextStyle['fontWeight']): FontWeightName {
  const value = numericWeight(weight);
  if (value >= 700) return 'bold';
  if (value >= 600) return 'semibold';
  return 'regular';
}

export function fontFamilyForWeight(weight: TextStyle['fontWeight']): string {
  return FONT_FAMILY[fontWeightName(weight)];
}

/** The style of a text variant, ready to spread into a text style. */
export function variantStyle(variant: TextVariant): TextStyle {
  const { fontSize, lineHeight, weight } = TEXT_VARIANTS[variant];
  return { fontSize, lineHeight, fontFamily: FONT_FAMILY[weight] };
}
