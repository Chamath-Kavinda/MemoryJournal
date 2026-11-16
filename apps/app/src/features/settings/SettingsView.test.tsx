const mockSignOut = jest.fn();

jest.mock('@/platform/auth/google', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('@/features/auth/authStore', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ user: { uid: 'u1', displayName: 'Ana', email: 'ana@example.com' } }),
}));
jest.mock('@/features/calendar/useTodayId', () => ({ useTodayId: () => '2026-11-15' }));
jest.mock('@/lib/journal', () => ({ useJournalRepository: () => ({}) }));
jest.mock('./useSettings', () => ({
  useSettings: () => ({
    status: 'ready',
    settings: { reminderEnabled: true, theme: 'dark' },
  }),
}));
jest.mock('./settingsService', () => ({
  setReminderEnabled: jest.fn(() => Promise.resolve()),
  setTheme: jest.fn(() => Promise.resolve()),
}));
jest.mock('./exportService', () => ({ exportAllData: jest.fn() }));
jest.mock('./deleteService', () => ({ deleteAccount: jest.fn() }));

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ConfirmProvider } from '@/components/useConfirm';

import { SettingsView } from './SettingsView';

const dialog = () => within(screen.getByTestId('confirm-dialog'));

describe('SettingsView sign out', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks first and names the account, and Cancel keeps the person signed in', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Sign out?')).toBeTruthy();
    expect(dialog().getByText(/ana@example\.com/)).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('signs out once the dialog is confirmed', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
