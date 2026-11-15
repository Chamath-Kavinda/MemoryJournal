import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from './ThemeProvider';
import { DARK_PALETTE, LIGHT_PALETTE } from './palette';
import { Text } from './themed';

function colorOf(testId: string): string | undefined {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style)?.color;
}

describe('themed Text', () => {
  it('uses the dark text colour when the dark theme is chosen', async () => {
    await render(
      <ThemeProvider preference="dark">
        <Text testID="t">Hello</Text>
      </ThemeProvider>,
    );
    expect(colorOf('t')).toBe(DARK_PALETTE.text);
  });

  it('uses the light text colour when the light theme is chosen', async () => {
    await render(
      <ThemeProvider preference="light">
        <Text testID="t">Hello</Text>
      </ThemeProvider>,
    );
    expect(colorOf('t')).toBe(LIGHT_PALETTE.text);
  });

  it('lets a style set its own colour', async () => {
    await render(
      <ThemeProvider preference="dark">
        <Text testID="t" style={{ color: 'red' }}>
          Hello
        </Text>
      </ThemeProvider>,
    );
    expect(colorOf('t')).toBe('red');
  });
});
