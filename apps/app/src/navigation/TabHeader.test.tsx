import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TabHeader } from './TabHeader';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.useFakeTimers();

beforeEach(() => mockPush.mockClear());

describe('TabHeader', () => {
  it('shows the title as a heading', async () => {
    await render(<TabHeader title="Tags" />);

    expect(screen.getByRole('header', { name: 'Tags' })).toBeTruthy();
  });

  it('opens Settings from the gear at the top right', async () => {
    await render(<TabHeader title="Tags" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('keeps extra controls next to the gear', async () => {
    await render(<TabHeader title="Tags" trailing={<Text>Extra</Text>} />);

    expect(screen.getByText('Extra')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
  });
});
