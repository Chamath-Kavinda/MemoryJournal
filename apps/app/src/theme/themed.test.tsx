import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Text, TextInput } from './themed';
import { FONT_FAMILY } from './typography';

function styleOf(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('themed Text fonts', () => {
  it('uses the regular weight when nothing else is asked for', async () => {
    await render(<Text testID="t">Hello</Text>);
    expect(styleOf('t')?.fontFamily).toBe(FONT_FAMILY.regular);
  });

  it('picks the bundled weight that matches fontWeight and resets the weight itself', async () => {
    await render(
      <>
        <Text testID="semi" style={{ fontWeight: '600' }}>
          Hello
        </Text>
        <Text testID="bold" style={{ fontWeight: '700' }}>
          Hello
        </Text>
      </>,
    );
    expect(styleOf('semi')).toMatchObject({
      fontFamily: FONT_FAMILY.semibold,
      fontWeight: 'normal',
    });
    expect(styleOf('bold')).toMatchObject({ fontFamily: FONT_FAMILY.bold, fontWeight: 'normal' });
  });

  it('applies the size, line height and weight of a type variant', async () => {
    await render(
      <Text testID="t" variant="title">
        Hello
      </Text>,
    );
    expect(styleOf('t')).toMatchObject({
      fontSize: 22,
      lineHeight: 28,
      fontFamily: FONT_FAMILY.bold,
    });
  });

  it('lets a style override the size of a variant and the weight of its family', async () => {
    await render(
      <Text testID="t" variant="title" style={{ fontSize: 30, fontWeight: '600' }}>
        Hello
      </Text>,
    );
    expect(styleOf('t')).toMatchObject({ fontSize: 30, fontFamily: FONT_FAMILY.semibold });
  });

  it('keeps a font family that the style sets itself, with its weight', async () => {
    await render(
      <Text testID="t" style={{ fontFamily: 'Courier', fontWeight: '700' }}>
        Hello
      </Text>,
    );
    expect(styleOf('t')).toMatchObject({ fontFamily: 'Courier', fontWeight: '700' });
  });
});

describe('themed TextInput fonts', () => {
  it('types in the regular weight', async () => {
    await render(<TextInput testID="i" />);
    expect(styleOf('i')?.fontFamily).toBe(FONT_FAMILY.regular);
  });
});
