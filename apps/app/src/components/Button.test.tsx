import { fireEvent, render, screen } from '@testing-library/react-native';
import { Plus } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { DARK_PALETTE, LIGHT_PALETTE } from '@/theme/palette';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { Button, type ButtonVariant } from './Button';

function labelColor(label: string): string | undefined {
  return StyleSheet.flatten(screen.getByText(label).props.style)?.color;
}

describe('Button', () => {
  it('calls onPress once when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing and reports itself disabled when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores presses and reports itself busy while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save', busy: true }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('can be read out with a longer accessibility label than the visible text', async () => {
    await render(<Button label="Save" accessibilityLabel="Save today" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Save today' })).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('keeps the text label next to an icon', async () => {
    await render(<Button label="New tag" icon={Plus} onPress={jest.fn()} />);
    expect(screen.getByText('New tag')).toBeTruthy();
  });

  describe.each([
    ['dark', DARK_PALETTE],
    ['light', LIGHT_PALETTE],
  ] as const)('in the %s theme', (scheme, palette) => {
    it.each([
      ['primary', palette.onGradient],
      ['secondary', palette.text],
      ['ghost', palette.accent],
      ['danger', palette.danger],
    ] as [ButtonVariant, string][])(
      'draws a %s button label in the right colour',
      async (variant, color) => {
        await render(
          <ThemeProvider preference={scheme}>
            <Button label="Go" variant={variant} onPress={jest.fn()} />
          </ThemeProvider>,
        );
        expect(labelColor('Go')).toBe(color);
      },
    );
  });
});
