const mockDeleteAccount = jest.fn();

jest.mock('./deleteService', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}));

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ConfirmProvider } from '@/components/useConfirm';

import { DeleteAccountSection } from './DeleteAccountSection';

const renderSection = () => render(<DeleteAccountSection uid="u1" />, { wrapper: ConfirmProvider });

const dialog = () => within(screen.getByTestId('confirm-dialog'));

/** Opens the first dialog (the warning) and confirms it, which opens the second (type DELETE). */
const reachTypingStep = async () => {
  await fireEvent.press(screen.getByText('Delete account and all data'));
  await screen.findByText('Delete your account?');
  await fireEvent.press(dialog().getByRole('button', { name: 'Delete account' }));
  await screen.findByText('Delete everything forever?');
};

describe('DeleteAccountSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with only the delete button and deletes nothing', async () => {
    await renderSection();

    expect(screen.getByText('Delete account and all data')).toBeTruthy();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('warns first, and says what is lost and that it cannot be undone', async () => {
    await renderSection();

    await fireEvent.press(screen.getByText('Delete account and all data'));

    expect(await screen.findByText(/cannot be undone/)).toBeTruthy();
    expect(screen.getByText(/Export your data first/)).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('backs out at the first step', async () => {
    await renderSection();
    await fireEvent.press(screen.getByText('Delete account and all data'));
    await screen.findByText('Delete your account?');

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(screen.getByText('Delete account and all data')).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('backs out at the second step without deleting anything', async () => {
    await renderSection();
    await reachTypingStep();
    await fireEvent.changeText(dialog().getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(screen.getByText('Delete account and all data')).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('keeps the final button disabled until DELETE is typed', async () => {
    mockDeleteAccount.mockResolvedValue({ status: 'deleted' });
    await renderSection();
    await reachTypingStep();

    const input = dialog().getByLabelText('Type DELETE to confirm');
    await fireEvent.changeText(input, 'DELET');
    expect(dialog().getByRole('button', { name: 'Delete forever' })).toBeDisabled();
    await fireEvent.press(dialog().getByRole('button', { name: 'Delete forever' }));
    expect(mockDeleteAccount).not.toHaveBeenCalled();

    await fireEvent.changeText(input, 'delete');
    await fireEvent.press(dialog().getByRole('button', { name: 'Delete forever' }));
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith('u1'));
  });

  it('says so when the person cancels the Google sign-in, and offers to start again', async () => {
    mockDeleteAccount.mockResolvedValue({ status: 'cancelled' });
    await renderSection();
    await reachTypingStep();
    await fireEvent.changeText(dialog().getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(dialog().getByRole('button', { name: 'Delete forever' }));

    expect(await screen.findByText('Deleting was cancelled. Nothing was deleted.')).toBeTruthy();
    expect(screen.getByText('Delete account and all data')).toBeTruthy();
  });

  it('shows the reason when deleting fails', async () => {
    mockDeleteAccount.mockResolvedValue({ status: 'error', message: 'No connection.' });
    await renderSection();
    await reachTypingStep();
    await fireEvent.changeText(dialog().getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(dialog().getByRole('button', { name: 'Delete forever' }));

    expect(await screen.findByText('Could not delete the account. No connection.')).toBeTruthy();
  });

  it('shows progress while deleting', async () => {
    mockDeleteAccount.mockReturnValue(new Promise(() => undefined));
    await renderSection();
    await reachTypingStep();
    await fireEvent.changeText(dialog().getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(dialog().getByRole('button', { name: 'Delete forever' }));

    expect(await screen.findByText(/Keep the app open/)).toBeTruthy();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(screen.queryByText('Delete account and all data')).toBeNull();
  });
});
