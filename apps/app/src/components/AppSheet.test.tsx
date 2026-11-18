import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/theme/themed';

import { AppSheet } from './AppSheet';
import { Button } from './Button';

jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => false }));

const METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, bottom: 48, left: 0, right: 0 },
};

async function renderSheet(onClose = jest.fn(), withFooter = true) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AppSheet
        title="Add time"
        onClose={onClose}
        testID="demo"
        {...(withFooter ? { footer: <Button label="Insert" onPress={() => undefined} /> } : {})}
      >
        <Text>Body text</Text>
      </AppSheet>
    </SafeAreaProvider>,
  );
  return onClose;
}

beforeEach(() => {
  // Reanimated drives its frames from timers, so every test runs on fake time.
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AppSheet', () => {
  it('shows a header with the title, the body and the footer', async () => {
    await renderSheet();

    const panel = within(screen.getByTestId('demo'));
    expect(panel.getByRole('header', { name: 'Add time' })).toBeTruthy();
    expect(panel.getByText('Body text')).toBeTruthy();
    const footer = within(screen.getByTestId('demo-footer'));
    expect(footer.getByRole('button', { name: 'Insert' })).toBeTruthy();
  });

  it('leaves the footer out when there are no buttons', async () => {
    await renderSheet(jest.fn(), false);

    expect(screen.getByTestId('demo')).toBeTruthy();
    expect(screen.queryByTestId('demo-footer')).toBeNull();
  });

  it('is announced as a modal dialog named by its title', async () => {
    await renderSheet();

    const panel = screen.getByTestId('demo');
    expect(panel.props.role).toBe('dialog');
    expect(panel.props.accessibilityViewIsModal).toBe(true);
    expect(panel.props.accessibilityLabel).toBe('Add time');
  });

  it('closes from the close icon, the backdrop and the hardware Back button or Esc', async () => {
    const onClose = await renderSheet();

    await fireEvent.press(screen.getByTestId('demo-close'));
    await fireEvent.press(screen.getByTestId('demo-backdrop'));
    const modal = screen.getByTestId('demo-modal', { includeHiddenElements: true });
    await act(async () => {
      modal.props.onRequestClose();
    });

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('is translucent behind the status bar and the navigation bar, and does not animate', async () => {
    await renderSheet();

    const modal = screen.getByTestId('demo-modal', { includeHiddenElements: true });
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(modal.props.navigationBarTranslucent).toBe(true);
    expect(modal.props.animationType).toBe('none');
  });
});

describe('AppSheet as a dialog', () => {
  it('has no header or close icon, and is announced as an alert dialog', async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AppSheet
          kind="dialog"
          title="Delete tag?"
          onClose={jest.fn()}
          testID="alert"
          panelTestID="alert-panel"
        >
          <Text>Sure?</Text>
        </AppSheet>
      </SafeAreaProvider>,
    );

    const panel = screen.getByTestId('alert-panel');
    expect(panel.props.role).toBe('alertdialog');
    expect(screen.queryByTestId('alert-header')).toBeNull();
    expect(screen.queryByTestId('alert-close')).toBeNull();
  });
});
