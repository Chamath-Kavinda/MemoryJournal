const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  Timestamp: { fromMillis: (ms: number) => ({ ms }) },
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

import { syncUserProfile } from './profileService';

const user = { uid: 'u1', displayName: 'Chama', email: 'chama@example.com' };
// 2026-11-14 12:00 UTC. Asia/Colombo is UTC+05:30 all year.
// The time zone is fixed to Asia/Colombo for the whole run in jest.globalSetup.js:
// setting process.env.TZ inside a test does not reach the real process under Jest.
const NOW = Date.UTC(2026, 10, 14, 12, 0, 0);

describe('syncUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the profile on first sign-in with the device zone', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await expect(syncUserProfile(user, NOW)).resolves.toBe('created');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = mockSetDoc.mock.calls[0] as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe('users/u1');
    expect(data).toMatchObject({
      displayName: 'Chama',
      email: 'chama@example.com',
      utcOffsetMinutes: 330,
      createdAt: { ms: NOW },
    });
  });

  it('leaves a matching profile alone', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ timeZone: 'Asia/Colombo', utcOffsetMinutes: 330 }),
    });

    await expect(syncUserProfile(user, NOW)).resolves.toBe('unchanged');
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('updates only the changed fields when the zone moved', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ timeZone: 'Asia/Colombo', utcOffsetMinutes: 300 }),
    });

    await expect(syncUserProfile(user, NOW)).resolves.toBe('updated');
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: 'users/u1' }, { utcOffsetMinutes: 330 });
  });

  it('reports unavailable instead of throwing when Firestore fails', async () => {
    mockGetDoc.mockRejectedValue(new Error('client is offline'));
    await expect(syncUserProfile(user, NOW)).resolves.toBe('unavailable');
  });
});
