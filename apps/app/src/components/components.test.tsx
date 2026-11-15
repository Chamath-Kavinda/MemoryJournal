import { fireEvent, render, screen } from '@testing-library/react-native';
import { Flame, Trash2 } from 'lucide-react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { MIN_TARGET } from '@/theme/layout';
import { DARK_PALETTE } from '@/theme/palette';

import { Card } from './Card';
import { Chip } from './Chip';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

describe('Card', () => {
  it('shows its children', async () => {
    await render(
      <Card>
        <NativeText>Inside</NativeText>
      </Card>,
    );
    expect(screen.getByText('Inside')).toBeTruthy();
  });

  it('draws a plain 1 px border on the surface colour by default', async () => {
    await render(
      <Card testID="card">
        <NativeText>Inside</NativeText>
      </Card>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('card').props.style)).toMatchObject({
      borderWidth: 1,
      borderRadius: 16,
      borderColor: DARK_PALETTE.border,
      backgroundColor: DARK_PALETTE.surface,
    });
  });

  it('wraps an active card in a 1 px gradient border', async () => {
    await render(
      <Card active testID="card">
        <NativeText>Inside</NativeText>
      </Card>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('card').props.style)).toMatchObject({
      padding: 1,
      borderRadius: 16,
    });
    expect(screen.getByText('Inside')).toBeTruthy();
  });
});

describe('Chip', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Chip label="People" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'People' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes whether it is selected', async () => {
    await render(
      <>
        <Chip label="People" selected onPress={jest.fn()} />
        <Chip label="Places" onPress={jest.fn()} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'People', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Places', selected: false })).toBeTruthy();
  });

  it('gives a selected chip a neon border', async () => {
    await render(
      <>
        <Chip label="People" selected onPress={jest.fn()} />
        <Chip label="Places" onPress={jest.fn()} />
      </>,
    );
    const border = (name: string) =>
      StyleSheet.flatten(screen.getByRole('button', { name }).props.style).borderColor;
    expect(border('People')).toBe(DARK_PALETTE.neonViolet);
    expect(border('Places')).toBe(DARK_PALETTE.border);
  });

  it('does nothing when disabled', async () => {
    const onPress = jest.fn();
    await render(<Chip label="People" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'People' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('is named by its accessibility label and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={Trash2} accessibilityLabel="Delete tag" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete tag' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has a touch target of at least 44 by 44', async () => {
    await render(<IconButton icon={Trash2} accessibilityLabel="Delete tag" onPress={jest.fn()} />);
    const style = StyleSheet.flatten(
      screen.getByRole('button', { name: 'Delete tag' }).props.style,
    );
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
    expect(style.width).toBe(MIN_TARGET);
  });

  it('does nothing when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton icon={Trash2} accessibilityLabel="Delete tag" disabled onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Delete tag' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Icon', () => {
  it('is announced as an image when it has a label', async () => {
    await render(<Icon icon={Flame} accessibilityLabel="Streak" />);
    expect(screen.getByRole('image', { name: 'Streak' })).toBeTruthy();
  });

  it('is hidden from screen readers when it is only decoration', async () => {
    await render(<Icon icon={Flame} />);
    expect(screen.queryByRole('image')).toBeNull();
  });
});
