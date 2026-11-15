import {
  FONT_FAMILY,
  TEXT_VARIANTS,
  fontFamilyForWeight,
  fontWeightName,
  variantStyle,
} from './typography';

describe('type scale', () => {
  it('matches section 15.7: display 28/34, title 22/28, heading 18/24, body 16/24, caption 13/18', () => {
    expect(TEXT_VARIANTS).toEqual({
      display: { fontSize: 28, lineHeight: 34, weight: 'bold' },
      title: { fontSize: 22, lineHeight: 28, weight: 'bold' },
      heading: { fontSize: 18, lineHeight: 24, weight: 'semibold' },
      body: { fontSize: 16, lineHeight: 24, weight: 'regular' },
      caption: { fontSize: 13, lineHeight: 18, weight: 'regular' },
    });
  });

  it('turns a variant into a style with the family of its weight', () => {
    expect(variantStyle('title')).toEqual({
      fontSize: 22,
      lineHeight: 28,
      fontFamily: FONT_FAMILY.bold,
    });
    expect(variantStyle('body').fontFamily).toBe(FONT_FAMILY.regular);
    expect(variantStyle('heading').fontFamily).toBe(FONT_FAMILY.semibold);
  });
});

describe('font weights', () => {
  it('registers the three bundled weights under their own family names', () => {
    expect(FONT_FAMILY).toEqual({
      regular: 'PlusJakartaSans_400Regular',
      semibold: 'PlusJakartaSans_600SemiBold',
      bold: 'PlusJakartaSans_700Bold',
    });
  });

  it.each([
    [undefined, 'regular'],
    ['normal', 'regular'],
    ['300', 'regular'],
    ['400', 'regular'],
    ['500', 'regular'],
    ['600', 'semibold'],
    ['700', 'bold'],
    ['bold', 'bold'],
    ['800', 'bold'],
    ['900', 'bold'],
  ] as const)('maps fontWeight %s to the %s weight', (weight, expected) => {
    expect(fontWeightName(weight)).toBe(expected);
    expect(fontFamilyForWeight(weight)).toBe(FONT_FAMILY[expected]);
  });
});
