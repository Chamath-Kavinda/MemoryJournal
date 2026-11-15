import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { BackHandler, Platform, Pressable, Text } from 'react-native';

import { ConfirmProvider } from '@/components/useConfirm';

import { useLeaveGuard } from './useLeaveGuard';

const leave = jest.fn();
const onDiscard = jest.fn();

function Screen({ dirty }: { dirty: boolean }) {
  const back = useLeaveGuard({ dirty, leave, message: 'Your changes will be lost.', onDiscard });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back}>
      <Text>Back</Text>
    </Pressable>
  );
}

const renderScreen = (dirty: boolean) =>
  render(<Screen dirty={dirty} />, { wrapper: ConfirmProvider });

const dialog = () => within(screen.getByTestId('confirm-dialog'));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('useLeaveGuard', () => {
  it('leaves at once when nothing is unsaved', async () => {
    await renderScreen(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(leave).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('asks first when there are unsaved changes, and Cancel stays', async () => {
    await renderScreen(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Discard changes?')).toBeTruthy();
    expect(dialog().getByText('Your changes will be lost.')).toBeTruthy();
    expect(leave).not.toHaveBeenCalled();

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(leave).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('drops the changes and then leaves once the dialog is confirmed', async () => {
    await renderScreen(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Discard changes' }));

    await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onDiscard.mock.invocationCallOrder[0]).toBeLessThan(
      leave.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('does not open a second dialog while one is open', async () => {
    await renderScreen(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back', includeHiddenElements: true }),
    );

    expect(screen.getAllByTestId('confirm-dialog')).toHaveLength(1);
  });

  describe('on Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('takes over the hardware Back button while there are unsaved changes', async () => {
      const remove = jest.fn();
      const add = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
      await renderScreen(true);

      const handler = add.mock.calls[0]?.[1];
      let handled: boolean | null | undefined;
      await act(async () => {
        // The handler ignores its argument, so any value will do.
        handled = handler?.(undefined as never);
      });

      expect(handled).toBe(true);
      expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
      expect(leave).not.toHaveBeenCalled();
    });

    it('leaves the hardware Back button alone when nothing is unsaved', async () => {
      const add = jest.spyOn(BackHandler, 'addEventListener');
      await renderScreen(false);

      expect(add).not.toHaveBeenCalled();
    });
  });
});
