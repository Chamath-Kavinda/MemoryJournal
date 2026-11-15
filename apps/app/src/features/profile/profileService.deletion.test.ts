const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  Timestamp: { fromMillis: (ms: number) => ms },
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

import { setDeletionInProgress } from '@/features/settings/deletionState';

import { syncUserProfile } from './profileService';

describe('syncUserProfile while an account is being deleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false });
  });
  afterEach(() => setDeletionInProgress(false));

  it('writes nothing, so the user document is not made again', async () => {
    setDeletionInProgress(true);

    const result = await syncUserProfile({ uid: 'u1', displayName: 'Ana', email: 'a@example.com' });

    expect(result).toBe('unavailable');
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('creates the user document as usual once the deletion is over', async () => {
    const result = await syncUserProfile({ uid: 'u1', displayName: 'Ana', email: 'a@example.com' });

    expect(result).toBe('created');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });
});
