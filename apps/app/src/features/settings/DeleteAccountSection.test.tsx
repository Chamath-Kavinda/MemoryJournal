const mockDeleteAccount = jest.fn();

jest.mock('./deleteService', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeleteAccountSection } from './DeleteAccountSection';

const startDeleting = async () => {
  await fireEvent.press(screen.getByText('Delete account and all data'));
  await fireEvent.press(screen.getByText('Continue'));
};

describe('DeleteAccountSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with only the delete button and deletes nothing', async () => {
    await render(<DeleteAccountSection uid="u1" />);

    expect(screen.getByText('Delete account and all data')).toBeTruthy();
    expect(screen.queryByText('Continue')).toBeNull();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('warns first, and says what is lost and that it cannot be undone', async () => {
    await render(<DeleteAccountSection uid="u1" />);

    await fireEvent.press(screen.getByText('Delete account and all data'));

    expect(screen.getByText(/cannot be undone/)).toBeTruthy();
    expect(screen.getByText(/Export your data first/)).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('backs out at the first step', async () => {
    await render(<DeleteAccountSection uid="u1" />);
    await fireEvent.press(screen.getByText('Delete account and all data'));

    await fireEvent.press(screen.getByText('Cancel'));

    expect(screen.getByText('Delete account and all data')).toBeTruthy();
    expect(screen.queryByText(/cannot be undone/)).toBeNull();
  });

  it('keeps the final button disabled until DELETE is typed', async () => {
    mockDeleteAccount.mockResolvedValue({ status: 'deleted' });
    await render(<DeleteAccountSection uid="u1" />);
    await startDeleting();

    const input = screen.getByLabelText('Type DELETE to confirm');
    await fireEvent.changeText(input, 'DELET');
    await fireEvent.press(screen.getByText('Delete forever'));
    expect(mockDeleteAccount).not.toHaveBeenCalled();

    await fireEvent.changeText(input, 'delete');
    await fireEvent.press(screen.getByText('Delete forever'));
    expect(mockDeleteAccount).toHaveBeenCalledWith('u1');
  });

  it('says so when the person cancels the Google sign-in, and offers to start again', async () => {
    mockDeleteAccount.mockResolvedValue({ status: 'cancelled' });
    await render(<DeleteAccountSection uid="u1" />);
    await startDeleting();
    await fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(screen.getByText('Delete forever'));

    expect(await screen.findByText('Deleting was cancelled. Nothing was deleted.')).toBeTruthy();
    expect(screen.getByText('Delete account and all data')).toBeTruthy();
  });

  it('shows the reason when deleting fails', async () => {
    mockDeleteAccount.mockResolvedValue({ status: 'error', message: 'No connection.' });
    await render(<DeleteAccountSection uid="u1" />);
    await startDeleting();
    await fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(screen.getByText('Delete forever'));

    expect(await screen.findByText('Could not delete the account. No connection.')).toBeTruthy();
  });

  it('shows progress while deleting', async () => {
    mockDeleteAccount.mockReturnValue(new Promise(() => undefined));
    await render(<DeleteAccountSection uid="u1" />);
    await startDeleting();
    await fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');

    await fireEvent.press(screen.getByText('Delete forever'));

    expect(screen.getByText(/Keep the app open/)).toBeTruthy();
    expect(screen.queryByText('Delete forever')).toBeNull();
  });
});
