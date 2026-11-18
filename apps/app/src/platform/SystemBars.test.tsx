import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { SystemBars } from './SystemBars';

const mockSetBackground = jest.fn();
const mockNavigationBar = jest.fn((_props: { style?: string }) => null);

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: (color: string) => mockSetBackground(color),
}));
jest.mock('expo-navigation-bar', () => ({
  NavigationBar: (props: { style?: string }) => mockNavigationBar(props),
}));

const originalOS = Platform.OS;

beforeEach(() => {
  mockSetBackground.mockReset().mockResolvedValue(undefined);
  mockNavigationBar.mockClear();
});

afterEach(() => {
  Platform.OS = originalOS;
});

describe('SystemBars', () => {
  it('uses light buttons on the dark theme and colours the window (Android)', async () => {
    Platform.OS = 'android';
    await render(
      <ThemeProvider preference="dark">
        <SystemBars />
      </ThemeProvider>,
    );

    expect(mockSetBackground).toHaveBeenCalledWith('#07070D');
    expect(mockNavigationBar).toHaveBeenCalledWith(expect.objectContaining({ style: 'light' }));
  });

  it('switches to dark buttons when the theme changes to light (Android)', async () => {
    Platform.OS = 'android';
    const view = await render(
      <ThemeProvider preference="dark">
        <SystemBars />
      </ThemeProvider>,
    );

    await view.rerender(
      <ThemeProvider preference="light">
        <SystemBars />
      </ThemeProvider>,
    );

    expect(mockSetBackground).toHaveBeenLastCalledWith('#F7F6FF');
    expect(mockNavigationBar).toHaveBeenLastCalledWith(expect.objectContaining({ style: 'dark' }));
  });

  it('ignores a failure from the native module', async () => {
    Platform.OS = 'android';
    mockSetBackground.mockRejectedValue(new Error('no native module'));
    await expect(
      render(
        <ThemeProvider preference="dark">
          <SystemBars />
        </ThemeProvider>,
      ),
    ).resolves.toBeDefined();
  });

  it('does nothing on other platforms', async () => {
    Platform.OS = 'web';
    await render(
      <ThemeProvider preference="dark">
        <SystemBars />
      </ThemeProvider>,
    );

    expect(mockSetBackground).not.toHaveBeenCalled();
    expect(mockNavigationBar).not.toHaveBeenCalled();
  });
});
