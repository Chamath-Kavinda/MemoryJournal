import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { TriangleAlert } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/theme/themed';

import type { ConfirmOptions } from './ConfirmDialog';
import { ConfirmProvider, useConfirm } from './useConfirm';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

const deleteTag: ConfirmOptions = {
  title: 'Delete tag?',
  message: 'Ana will be deleted. Mentions in your old entries stay as plain text.',
  confirmLabel: 'Delete tag',
};

/** A button that opens the dialog and reports what the person decided. */
function Harness({
  options = deleteTag,
  label = 'Open',
  onResult,
}: {
  options?: ConfirmOptions;
  label?: string;
  onResult: (confirmed: boolean) => void;
}) {
  const confirm = useConfirm();
  return (
    <Pressable
      accessibilityRole="button"
      // Returns nothing: the test's `await fireEvent.press` must not wait for the dialog to close.
      onPress={() => {
        void confirm(options).then(onResult);
      }}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

async function open(onResult = jest.fn(), options?: ConfirmOptions) {
  await render(
    <ConfirmProvider>
      <Harness onResult={onResult} {...(options ? { options } : {})} />
    </ConfirmProvider>,
  );
  await fireEvent.press(screen.getByText('Open'));
  await screen.findByTestId('confirm-dialog');
  return onResult;
}

const dialog = () => within(screen.getByTestId('confirm-dialog'));

function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  const animated = (node.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
  return { ...StyleSheet.flatten(node.props.style), ...animated } as Record<string, unknown>;
}

function scaleOf(testID: string): number {
  const transform = styleOf(testID).transform as { scale?: number }[] | undefined;
  return transform?.find((t) => t.scale !== undefined)?.scale ?? 1;
}

/** Advances fake time in 50 ms steps, so animations that chain (springs) get frames in between. */
async function settle(ms = 1500) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
  }
}

beforeEach(() => {
  mockReduce = false;
  // Reanimated drives its frames from timers, so every test runs on fake time.
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ConfirmDialog', () => {
  it('names the action, the item and the verb, and offers Cancel', async () => {
    await open();

    expect(dialog().getByText('Delete tag?')).toBeTruthy();
    expect(
      dialog().getByText('Ana will be deleted. Mentions in your old entries stay as plain text.'),
    ).toBeTruthy();
    expect(dialog().getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(dialog().getByRole('button', { name: 'Delete tag' })).toBeTruthy();
    // The verb is specific: never OK or Yes.
    expect(dialog().queryByText('OK')).toBeNull();
    expect(dialog().queryByText('Yes')).toBeNull();
  });

  it('puts Cancel before the action button, so focus lands on Cancel', async () => {
    await open();

    const labels = dialog()
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel as string);
    expect(labels).toEqual(['Cancel', 'Delete tag']);
  });

  it('resolves false and closes on Cancel', async () => {
    const onResult = await open();

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('resolves true and closes on the action button', async () => {
    const onResult = await open();

    await fireEvent.press(dialog().getByRole('button', { name: 'Delete tag' }));

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('treats a tap on the backdrop as Cancel', async () => {
    const onResult = await open();

    await fireEvent.press(screen.getByTestId('confirm-backdrop'));

    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('treats the hardware Back button and Esc as Cancel', async () => {
    const onResult = await open();

    // React Native calls onRequestClose for the Android Back button; react-native-web does the
    // same for Esc.
    const modal = screen.getByTestId('confirm-modal', { includeHiddenElements: true });

    await act(async () => {
      modal.props.onRequestClose();
    });

    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('shows a notice with one button, no Cancel, and resolves true on it', async () => {
    const onResult = await open(jest.fn(), {
      title: 'Your journal is only on this device',
      message: 'Stored on this device only. Sign in to back it up.',
      confirmLabel: 'Got it',
      notice: true,
    });

    const labels = dialog()
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel as string);
    expect(labels).toEqual(['Got it']);
    expect(dialog().queryByRole('button', { name: 'Cancel' })).toBeNull();

    await fireEvent.press(dialog().getByRole('button', { name: 'Got it' }));

    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('closes a notice as dismissed on the backdrop, so the caller can still carry on', async () => {
    const onResult = await open(jest.fn(), {
      title: 'Your journal is only on this device',
      message: 'Stored on this device only.',
      confirmLabel: 'Got it',
      notice: true,
    });

    await fireEvent.press(screen.getByTestId('confirm-backdrop'));

    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('is announced as a modal alert dialog', async () => {
    await open();

    const node = screen.getByTestId('confirm-dialog');
    expect(node.props.role).toBe('alertdialog');
    expect(node.props.accessibilityViewIsModal).toBe(true);
    expect(dialog().getByRole('header', { name: 'Delete tag?' })).toBeTruthy();
  });

  it('can show a different icon for risky actions that are not deletes', async () => {
    await open(jest.fn(), {
      title: 'Sign out?',
      message: 'Sign out of ana@example.com?',
      confirmLabel: 'Sign out',
      icon: TriangleAlert,
    });

    expect(dialog().getByText('Sign out?')).toBeTruthy();
    expect(dialog().getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });

  it('keeps the action button off until the typed word matches', async () => {
    const onResult = await open(jest.fn(), {
      title: 'Delete everything forever?',
      message: 'Type DELETE to confirm.',
      confirmLabel: 'Delete forever',
      typed: { label: 'Type DELETE to confirm', matches: (text) => text.trim() === 'DELETE' },
    });
    const field = dialog().getByLabelText('Type DELETE to confirm');
    const action = dialog().getByRole('button', { name: 'Delete forever' });
    expect(action).toBeDisabled();

    await fireEvent.changeText(field, 'DELET');
    await fireEvent.press(action);
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();

    await fireEvent.changeText(field, 'DELETE');
    expect(dialog().getByRole('button', { name: 'Delete forever' })).toBeEnabled();
    await fireEvent.press(dialog().getByRole('button', { name: 'Delete forever' }));
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('closes an open dialog as cancelled when another one is asked for', async () => {
    const first = jest.fn();
    const second = jest.fn();
    await render(
      <ConfirmProvider>
        <Harness label="First" onResult={first} />
        <Harness
          label="Second"
          onResult={second}
          options={{
            title: 'Delete category?',
            message: 'Songs.',
            confirmLabel: 'Delete category',
          }}
        />
      </ConfirmProvider>,
    );

    await fireEvent.press(screen.getByText('First'));
    await screen.findByText('Delete tag?');
    await fireEvent.press(screen.getByText('Second'));

    expect(await screen.findByText('Delete category?')).toBeTruthy();
    expect(screen.queryByText('Delete tag?')).toBeNull();
    expect(first).toHaveBeenCalledWith(false);
    expect(second).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog motion', () => {
  it('fades the backdrop in and scales the dialog up from 0.92 to 1', async () => {
    await render(
      <ConfirmProvider>
        <Harness onResult={jest.fn()} />
      </ConfirmProvider>,
    );
    await fireEvent.press(screen.getByText('Open'));
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();

    await settle();

    expect(styleOf('confirm-scrim').opacity).toBe(1);
    expect(styleOf('confirm-dialog').opacity).toBe(1);
    expect(scaleOf('confirm-dialog')).toBeCloseTo(1, 2);
  });

  it('only fades, without scaling, when reduce motion is on', async () => {
    mockReduce = true;
    await render(
      <ConfirmProvider>
        <Harness onResult={jest.fn()} />
      </ConfirmProvider>,
    );
    await fireEvent.press(screen.getByText('Open'));
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();

    await settle(300);

    expect(scaleOf('confirm-dialog')).toBe(1);
    expect(styleOf('confirm-dialog').opacity).toBe(1);
    expect(styleOf('confirm-scrim').opacity).toBe(1);
  });
});
