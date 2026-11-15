const mockUpdateDoc = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

import { setReminderEnabled, setTheme, subscribeSettings } from './settingsService';

describe('subscribeSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listens to the user document', () => {
    const stop = jest.fn();
    mockOnSnapshot.mockReturnValue(stop);

    const result = subscribeSettings('u1', jest.fn(), jest.fn());

    const [ref] = mockOnSnapshot.mock.calls[0] as [{ path: string }];
    expect(ref.path).toBe('users/u1');
    expect(result).toBe(stop);
  });

  it('reads the stored settings', () => {
    const onChange = jest.fn();
    mockOnSnapshot.mockImplementation((_ref, next: (snapshot: unknown) => void) =>
      next({ data: () => ({ settings: { reminderEnabled: false, theme: 'dark' } }) }),
    );

    subscribeSettings('u1', onChange, jest.fn());

    expect(onChange).toHaveBeenCalledWith({ reminderEnabled: false, theme: 'dark' });
  });

  it('reads the defaults while the user document does not exist yet', () => {
    const onChange = jest.fn();
    mockOnSnapshot.mockImplementation((_ref, next: (snapshot: unknown) => void) =>
      next({ data: () => undefined }),
    );

    subscribeSettings('u1', onChange, jest.fn());

    expect(onChange).toHaveBeenCalledWith({ reminderEnabled: true, theme: 'dark' });
  });

  it('passes errors on', () => {
    const onError = jest.fn();
    const failure = new Error('denied');
    mockOnSnapshot.mockImplementation((_ref, _next: unknown, error: (reason: Error) => void) =>
      error(failure),
    );

    subscribeSettings('u1', jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe('setters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('changes only the reminder field', async () => {
    await setReminderEnabled('u1', false);

    const [ref, data] = mockUpdateDoc.mock.calls[0] as [{ path: string }, unknown];
    expect(ref.path).toBe('users/u1');
    expect(data).toEqual({ 'settings.reminderEnabled': false });
  });

  it('changes only the theme field', async () => {
    await setTheme('u1', 'light');

    const [, data] = mockUpdateDoc.mock.calls[0] as [unknown, unknown];
    expect(data).toEqual({ 'settings.theme': 'light' });
  });

  it('passes a refused write on to the caller', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('permission-denied'));

    await expect(setReminderEnabled('u1', true)).rejects.toThrow('permission-denied');
  });
});
