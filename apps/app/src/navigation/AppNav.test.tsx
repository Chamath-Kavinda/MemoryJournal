import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar, NAV_ITEMS, SideNav, TAB_ITEMS, isCurrent, isTabScreen } from './AppNav';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPathname = '/home';

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// The press animation and the tooltip timer need fake timers for the whole file.
jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function withInsets(element: React.ReactElement) {
  return <SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>;
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockPathname = '/home';
});

describe('isCurrent and isTabScreen', () => {
  it('marks a section as current for its own screens too', () => {
    expect(isCurrent('/tags', '/tags')).toBe(true);
    expect(isCurrent('/tags/new', '/tags')).toBe(true);
    expect(isCurrent('/tagsfoo', '/tags')).toBe(false);
  });

  it('shows the bottom bar on the five tab screens only', () => {
    for (const item of TAB_ITEMS) expect(isTabScreen(item.href)).toBe(true);
    expect(isTabScreen('/settings')).toBe(false);
    expect(isTabScreen('/day/2026-11-14')).toBe(false);
    expect(isTabScreen('/tags/new')).toBe(false);
    expect(isTabScreen('/library/abc')).toBe(false);
    expect(isTabScreen('/learn/memory-palace')).toBe(false);
  });

  it('keeps Settings as the sixth shortcut after the five tabs', () => {
    expect(NAV_ITEMS).toHaveLength(6);
    expect(NAV_ITEMS[5]?.href).toBe('/settings');
  });
});

describe('BottomTabBar', () => {
  it('has five tabs named for screen readers and no visible text', async () => {
    await render(withInsets(<BottomTabBar />));

    for (const item of TAB_ITEMS) {
      expect(screen.getByRole('tab', { name: item.label })).toBeTruthy();
      expect(screen.queryByText(item.label)).toBeNull();
    }
    expect(screen.queryByRole('tab', { name: 'Settings' })).toBeNull();
  });

  it('announces the current tab as selected, also on a screen opened from it', async () => {
    mockPathname = '/tags/new';
    await render(withInsets(<BottomTabBar />));

    expect(screen.getByRole('tab', { name: 'Tags', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Home', selected: false })).toBeTruthy();
  });

  it('draws the gradient pill under the active tab only', async () => {
    mockPathname = '/insights';
    await render(withInsets(<BottomTabBar />));

    expect(screen.getByTestId('nav-insights-indicator')).toBeTruthy();
    expect(screen.queryByTestId('nav-home-indicator')).toBeNull();
    expect(screen.queryByTestId('nav-tags-indicator')).toBeNull();
  });

  it('switches section without piling up history', async () => {
    await render(withInsets(<BottomTabBar />));

    await fireEvent.press(screen.getByRole('tab', { name: 'Library' }));

    expect(mockReplace).toHaveBeenCalledWith('/library');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the name after a long press and hides it again', async () => {
    await render(withInsets(<BottomTabBar />));

    await fireEvent(screen.getByRole('tab', { name: 'Learn' }), 'longPress');
    // The name is a visual hint only: it is hidden from screen readers, which already get the tab label.
    expect(screen.getByText('Learn', { includeHiddenElements: true })).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1600);
    });
    expect(screen.queryByText('Learn', { includeHiddenElements: true })).toBeNull();
  });

  it('is 56 tall plus the bottom safe area', async () => {
    await render(
      <SafeAreaProvider initialMetrics={{ ...METRICS, insets: { ...METRICS.insets, bottom: 20 } }}>
        <BottomTabBar />
      </SafeAreaProvider>,
    );

    const bar = StyleSheet.flatten(screen.getByLabelText('Main').props.style) as ViewStyle;
    expect(bar.height).toBe(76);
    expect(bar.paddingBottom).toBe(20);
  });
});

describe('SideNav', () => {
  it('is 72 wide with the five sections and Settings, all icon only', async () => {
    await render(<SideNav />);

    const bar = StyleSheet.flatten(screen.getByLabelText('Main').props.style) as ViewStyle;
    expect(bar.width).toBe(72);
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: item.label })).toBeTruthy();
      expect(screen.queryByText(item.label)).toBeNull();
    }
  });

  it('marks the current section as selected', async () => {
    mockPathname = '/library/abc';
    await render(<SideNav />);

    expect(screen.getByRole('link', { name: 'Library', selected: true })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Home', selected: false })).toBeTruthy();
  });

  it('opens Settings from the bottom of the sidebar', async () => {
    await render(<SideNav />);

    await fireEvent.press(screen.getByRole('link', { name: 'Settings' }));

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
