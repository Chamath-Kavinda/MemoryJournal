const mockSignOut = jest.fn();
const mockPush = jest.fn();
const mockShutDown = jest.fn(() => Promise.resolve());
const mockClearDrafts = jest.fn((uid: string) => Promise.resolve(uid));
const mockForgetRepository = jest.fn();
const mockStartAuthListener = jest.fn();
const mockExportAll = jest.fn();
const mockExportGuest = jest.fn();
const mockRepository = { name: 'repository' };
let mockUser: { uid: string; displayName: string; email: string } | null = {
  uid: 'u1',
  displayName: 'Ana',
  email: 'ana@example.com',
};
let mockRepositoryReady = true;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/platform/auth/google', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('@/features/auth/authStore', () => ({
  useAuthStore: (select: (state: unknown) => unknown) => select({ user: mockUser }),
  startAuthListener: (...args: unknown[]) => mockStartAuthListener(...args),
}));
jest.mock('@/features/calendar/useTodayId', () => ({ useTodayId: () => '2026-11-15' }));
jest.mock('@/lib/journal', () => ({
  useJournalRepository: () => (mockRepositoryReady ? mockRepository : null),
  getJournalRepository: () => mockRepository,
  forgetAccountRepository: (...args: unknown[]) => mockForgetRepository(...args),
}));
jest.mock('@/lib/firebase', () => ({
  shutDownFirebase: () => mockShutDown(),
}));
jest.mock('@/features/day/draftStorage', () => ({
  clearUserDrafts: (uid: string) => mockClearDrafts(uid),
}));
jest.mock('@/features/reminder/reminderService', () => ({
  remindersSupported: false,
  syncReminder: jest.fn(() => Promise.resolve()),
}));
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
jest.mock('./exportService', () => ({
  exportAllData: (...args: unknown[]) => mockExportAll(...args),
  exportGuestData: (...args: unknown[]) => mockExportGuest(...args),
}));
jest.mock('./deleteService', () => ({ deleteAccount: jest.fn() }));
jest.mock('./eraseGuestService', () => ({ eraseGuestData: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '0.2.0' } },
}));

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ConfirmProvider } from '@/components/useConfirm';

import { SettingsView } from './SettingsView';

const dialog = () => within(screen.getByTestId('confirm-dialog'));

const signedIn = { uid: 'u1', displayName: 'Ana', email: 'ana@example.com' };

describe('SettingsView sign out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = signedIn;
    mockRepositoryReady = true;
  });

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

  it('signs out and wipes the device once the dialog is confirmed', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByTestId('confirm-dialog');
    expect(dialog().getByText(/removes the journal from this device/)).toBeTruthy();
    await fireEvent.press(dialog().getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockStartAuthListener).toHaveBeenCalledTimes(1));
    expect(mockShutDown).toHaveBeenCalledTimes(1);
    expect(mockClearDrafts).toHaveBeenCalledWith('u1');
    expect(mockForgetRepository).toHaveBeenCalledTimes(1);
  });

  it('does not wipe anything when Cancel is pressed', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(mockShutDown).not.toHaveBeenCalled();
    expect(mockClearDrafts).not.toHaveBeenCalled();
  });

  it('shows the account profile and Delete account, and no guest wording', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('Delete account and all data')).toBeTruthy();
    expect(screen.queryByText('Guest')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in with Google' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Erase guest data' })).toBeNull();
  });

  it('exports the account through the account export', async () => {
    mockExportAll.mockResolvedValue('delivered');
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Export all data (JSON)' }));

    await waitFor(() => expect(mockExportAll).toHaveBeenCalledWith('u1', '2026-11-15'));
    expect(mockExportGuest).not.toHaveBeenCalled();
  });
});

describe('SettingsView as a guest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockRepositoryReady = true;
  });

  it('shows Guest, where the journal is kept, and a Sign in with Google button', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    expect(screen.getByText('Guest')).toBeTruthy();
    // The cloud-off icon is decorative for screen readers (the words carry the meaning), so it is
    // hidden from the accessibility tree and has to be looked up with hidden elements included.
    expect(screen.getByLabelText('Not backed up', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(/Stored on this device only\. Sign in to back it up\./)).toBeTruthy();
    expect(
      screen.getByText(/Uninstalling the app or clearing its data removes a guest journal/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeTruthy();
  });

  it('opens the sign-in screen from the button', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));

    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('hides Sign out and Delete account, and offers Erase guest data instead', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    expect(screen.queryByText('Delete account and all data')).toBeNull();
    expect(screen.getByRole('button', { name: 'Erase guest data' })).toBeTruthy();
  });

  it('keeps the reminder, theme and export controls', async () => {
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    expect(screen.getByLabelText('Daily 9 PM reminder')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export all data (JSON)' })).toBeTruthy();
  });

  it('exports from the on-device repository, not the account', async () => {
    mockExportGuest.mockResolvedValue('delivered');
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Export all data (JSON)' }));

    await waitFor(() => expect(mockExportGuest).toHaveBeenCalledWith(mockRepository, '2026-11-15'));
    expect(mockExportAll).not.toHaveBeenCalled();
    expect(await screen.findByText('Your data was exported.')).toBeTruthy();
  });

  it('shows a plain message when the guest export fails', async () => {
    mockExportGuest.mockRejectedValue(new Error('disk full'));
    await render(<SettingsView />, { wrapper: ConfirmProvider });

    await fireEvent.press(screen.getByRole('button', { name: 'Export all data (JSON)' }));

    expect(await screen.findByText('Could not export your data. Try again.')).toBeTruthy();
  });

  it('shows nothing while the app is still working out who is using it', async () => {
    mockRepositoryReady = false;

    await render(<SettingsView />, { wrapper: ConfirmProvider });

    expect(screen.queryByText('Guest')).toBeNull();
    expect(screen.queryByText('Daily reminder')).toBeNull();
  });
});
