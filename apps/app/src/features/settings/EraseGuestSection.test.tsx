const mockEraseGuestData = jest.fn();

jest.mock('./eraseGuestService', () => ({
  eraseGuestData: (...args: unknown[]) => mockEraseGuestData(...args),
}));

import type { JournalRepository } from '@memory-journal/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ConfirmProvider } from '@/components/useConfirm';

import { EraseGuestSection } from './EraseGuestSection';

const repository = {} as JournalRepository;
const renderSection = () =>
  render(<EraseGuestSection repository={repository} />, { wrapper: ConfirmProvider });

const dialog = () => within(screen.getByTestId('confirm-dialog'));
const eraseButton = () => screen.getByRole('button', { name: 'Erase guest data' });

/** Opens the first dialog (the warning) and confirms it, which opens the second (type DELETE). */
const reachTypingStep = async () => {
  await fireEvent.press(eraseButton());
  await screen.findByText('Erase guest data?');
  await fireEvent.press(dialog().getByRole('button', { name: 'Erase guest data' }));
  await screen.findByText('Erase everything forever?');
};

describe('EraseGuestSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with only the erase button and erases nothing', async () => {
    await renderSection();

    expect(eraseButton()).toBeTruthy();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(mockEraseGuestData).not.toHaveBeenCalled();
  });

  it('warns first, and says it is on this device only and cannot be undone', async () => {
    await renderSection();

    await fireEvent.press(eraseButton());

    expect(await screen.findByText(/cannot be undone/)).toBeTruthy();
    expect(screen.getByText(/nothing is backed up/)).toBeTruthy();
    expect(screen.getByText(/Export your data first/)).toBeTruthy();
    expect(mockEraseGuestData).not.toHaveBeenCalled();
  });

  it('backs out at the first step', async () => {
    await renderSection();
    await fireEvent.press(eraseButton());
    await screen.findByText('Erase guest data?');

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(mockEraseGuestData).not.toHaveBeenCalled();
  });

  it('backs out at the second step without erasing anything', async () => {
    await renderSection();
    await reachTypingStep();
    await fireEvent.changeText(dialog().getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(mockEraseGuestData).not.toHaveBeenCalled();
  });

  it('keeps the final button disabled until DELETE is typed, then erases the repository', async () => {
    mockEraseGuestData.mockResolvedValue({ status: 'erased' });
    await renderSection();
    await reachTypingStep();

    const input = dialog().getByLabelText('Type DELETE to confirm');
    await fireEvent.changeText(input, 'DELET');
    expect(dialog().getByRole('button', { name: 'Erase forever' })).toBeDisabled();
    await fireEvent.press(dialog().getByRole('button', { name: 'Erase forever' }));
    expect(mockEraseGuestData).not.toHaveBeenCalled();

    await fireEvent.changeText(input, 'delete');
    await fireEvent.press(dialog().getByRole('button', { name: 'Erase forever' }));

    await waitFor(() => expect(mockEraseGuestData).toHaveBeenCalledWith(repository));
    expect(await screen.findByText('Guest data was erased from this device.')).toBeTruthy();
  });

  it('shows the reason when erasing fails', async () => {
    mockEraseGuestData.mockResolvedValue({ status: 'error', message: 'Storage is full.' });
    await renderSection();
    await reachTypingStep();
    await fireEvent.changeText(dialog().getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(dialog().getByRole('button', { name: 'Erase forever' }));

    expect(
      await screen.findByText('Could not erase the guest data. Storage is full.'),
    ).toBeTruthy();
  });

  it('shows progress while erasing', async () => {
    mockEraseGuestData.mockReturnValue(new Promise(() => undefined));
    await renderSection();
    await reachTypingStep();
    await fireEvent.changeText(dialog().getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(dialog().getByRole('button', { name: 'Erase forever' }));

    expect(await screen.findByText(/Keep the app open/)).toBeTruthy();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Erase guest data' })).toBeNull();
  });
});
