const mockEvents: string[] = [];
const mockCollections: Record<string, string[]> = {};
let mockBatch: string[] = [];
let mockInProgressAtRequest: boolean | null = null;
const mockUser = { uid: 'u1' };
const mockReauth = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteUser = jest.fn();
const mockClearDrafts = jest.fn();
const mockSyncReminder = jest.fn();

const mockJoin = (base: unknown, rest: string[]) => ({
  path: [(base as { path?: string }).path, ...rest].filter(Boolean).join('/'),
});

jest.mock('@/lib/firebase', () => ({
  getFirebase: () => ({ db: {}, auth: { currentUser: mockUser } }),
}));
jest.mock('firebase/auth', () => ({
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
}));
jest.mock('firebase/firestore', () => ({
  collection: (base: unknown, ...rest: string[]) => mockJoin(base, rest),
  doc: (base: unknown, ...rest: string[]) => mockJoin(base, rest),
  serverTimestamp: () => 'SERVER_TIME',
  getDocs: (ref: { path: string }) =>
    Promise.resolve({
      docs: (mockCollections[ref.path] ?? []).map((id) => ({
        id,
        ref: { path: `${ref.path}/${id}` },
      })),
    }),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (ref: { path: string }) => {
    mockEvents.push(`deleteDoc:${ref.path}`);
    return Promise.resolve();
  },
  writeBatch: () => ({
    delete: (ref: { path: string }) => mockBatch.push(ref.path),
    commit: () => {
      mockEvents.push(`commit:${mockBatch.length}:${mockBatch[0]}`);
      mockBatch = [];
      return Promise.resolve();
    },
  }),
}));
jest.mock('@/platform/auth/google', () => ({
  reauthenticateWithGoogle: (...args: unknown[]) => mockReauth(...args),
}));
jest.mock('@/features/day/draftStorage', () => ({
  clearUserDrafts: (...args: unknown[]) => mockClearDrafts(...args),
}));
jest.mock('@/features/reminder/reminderService', () => ({
  remindersSupported: true,
  syncReminder: (...args: unknown[]) => mockSyncReminder(...args),
}));

import { isDeletionInProgress } from './deletionState';
import { deleteAccount } from './deleteService';

function seed(): void {
  mockCollections['users/u1/days'] = ['2026-11-14', '2026-11-13'];
  mockCollections['users/u1/days/2026-11-14/revisions'] = ['1', '2'];
  mockCollections['users/u1/days/2026-11-13/revisions'] = ['1'];
  mockCollections['users/u1/library'] = ['m1'];
  mockCollections['users/u1/library/m1/revisions'] = ['1'];
  mockCollections['users/u1/tags'] = ['t1'];
  mockCollections['users/u1/tagCategories'] = ['people'];
  mockCollections['users/u1/progress'] = ['tutorials'];
}

describe('deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvents.length = 0;
    mockBatch = [];
    mockInProgressAtRequest = null;
    for (const key of Object.keys(mockCollections)) delete mockCollections[key];
    mockReauth.mockResolvedValue({ status: 'signed-in' });
    mockUpdateDoc.mockImplementation((ref: { path: string }, data: unknown) => {
      mockInProgressAtRequest = isDeletionInProgress();
      mockEvents.push(`request:${ref.path}:${JSON.stringify(data)}`);
      return Promise.resolve();
    });
    mockDeleteUser.mockImplementation(() => {
      mockEvents.push('deleteUser');
      return Promise.resolve();
    });
    mockClearDrafts.mockImplementation(() => {
      mockEvents.push('drafts');
      return Promise.resolve();
    });
    mockSyncReminder.mockResolvedValue('cancelled');
  });

  it('touches nothing when the person cancels the sign-in', async () => {
    mockReauth.mockResolvedValue({ status: 'cancelled' });

    await expect(deleteAccount('u1')).resolves.toEqual({ status: 'cancelled' });

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('touches nothing when the sign-in fails, for example with another Google account', async () => {
    mockReauth.mockResolvedValue({ status: 'error', message: 'Wrong account.' });

    await expect(deleteAccount('u1')).resolves.toEqual({
      status: 'error',
      message: 'Wrong account.',
    });

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockEvents).toEqual([]);
  });

  it('asks for permission first, then deletes revisions, parents, the user document and the account', async () => {
    seed();

    await expect(deleteAccount('u1')).resolves.toEqual({ status: 'deleted' });

    const request = mockEvents[0]!;
    expect(request).toBe('request:users/u1:{"deletionRequestedAt":"SERVER_TIME"}');

    const commits = mockEvents.filter((event) => event.startsWith('commit:'));
    // Revisions of days, revisions of library pages, days, library, tags, categories, progress.
    expect(commits).toEqual([
      'commit:3:users/u1/days/2026-11-14/revisions/1',
      'commit:1:users/u1/library/m1/revisions/1',
      'commit:2:users/u1/days/2026-11-14',
      'commit:1:users/u1/library/m1',
      'commit:1:users/u1/tags/t1',
      'commit:1:users/u1/tagCategories/people',
      'commit:1:users/u1/progress/tutorials',
    ]);

    const userDoc = mockEvents.indexOf('deleteDoc:users/u1');
    const lastCommit = mockEvents.lastIndexOf(commits[commits.length - 1]!);
    expect(userDoc).toBeGreaterThan(lastCommit);
    expect(mockEvents.slice(userDoc)).toEqual(['deleteDoc:users/u1', 'drafts', 'deleteUser']);
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
  });

  it("cancels the reminder and clears this device's drafts for the user", async () => {
    seed();

    await deleteAccount('u1');

    expect(mockClearDrafts).toHaveBeenCalledWith('u1');
    expect(mockSyncReminder).toHaveBeenCalledWith(false);
  });

  it('deletes large journals in batches under the Firestore limit', async () => {
    mockCollections['users/u1/tags'] = Array.from({ length: 850 }, (_, index) => `t${index}`);

    await deleteAccount('u1');

    const sizes = mockEvents
      .filter((event) => event.startsWith('commit:'))
      .map((event) => Number(event.split(':')[1]));
    expect(sizes).toEqual([400, 400, 50]);
  });

  it('is marked as in progress during the deletion and cleared afterwards', async () => {
    seed();

    await deleteAccount('u1');

    expect(mockInProgressAtRequest).toBe(true);
    expect(isDeletionInProgress()).toBe(false);
  });

  it('continues when an earlier attempt already removed the user document', async () => {
    seed();
    mockUpdateDoc.mockRejectedValue(Object.assign(new Error('missing'), { code: 'not-found' }));

    await expect(deleteAccount('u1')).resolves.toEqual({ status: 'deleted' });

    expect(mockDeleteUser).toHaveBeenCalled();
  });

  it('deletes nothing when the server refuses the request', async () => {
    seed();
    mockUpdateDoc.mockRejectedValue(new Error('permission-denied'));

    const result = await deleteAccount('u1');

    expect(result).toEqual({ status: 'error', message: 'permission-denied' });
    expect(mockEvents.filter((event) => event.startsWith('commit:'))).toEqual([]);
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(isDeletionInProgress()).toBe(false);
  });

  it('gives up with a clear message when the server cannot be reached', async () => {
    jest.useFakeTimers();
    try {
      mockUpdateDoc.mockReturnValue(new Promise(() => undefined));

      const pending = deleteAccount('u1');
      await jest.advanceTimersByTimeAsync(30_000);
      const result = await pending;

      expect(result.status).toBe('error');
      expect(result.status === 'error' && result.message).toMatch(/internet connection/);
      expect(mockDeleteUser).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports a failed account removal after the data is gone, so it can be run again', async () => {
    seed();
    mockDeleteUser.mockRejectedValue(new Error('network-request-failed'));

    const result = await deleteAccount('u1');

    expect(result).toEqual({ status: 'error', message: 'network-request-failed' });
    expect(mockEvents).toContain('deleteDoc:users/u1');
    expect(isDeletionInProgress()).toBe(false);
  });
});
