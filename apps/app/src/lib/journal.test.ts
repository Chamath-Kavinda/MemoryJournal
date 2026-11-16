jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
  },
}));
jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), doc: jest.fn() }));
jest.mock('@/features/auth/authStore', () => {
  const state = { status: 'loading', user: null as { uid: string } | null };
  return {
    useAuthStore: Object.assign((selector: (s: typeof state) => unknown) => selector(state), {
      state,
    }),
  };
});

import { LocalRepository } from '@memory-journal/core';
import { renderHook } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/authStore';

import { FirestoreRepository } from './firestoreRepository';
import { getJournalRepository, resetJournalRepositories, useJournalRepository } from './journal';

const authState = (useAuthStore as unknown as { state: { status: string; user: unknown } }).state;

beforeEach(() => {
  resetJournalRepositories();
  authState.status = 'loading';
  authState.user = null;
});

describe('getJournalRepository', () => {
  it('gives one guest journal to everyone who is not signed in', () => {
    const guest = getJournalRepository(null);

    expect(guest).toBeInstanceOf(LocalRepository);
    expect(getJournalRepository(null)).toBe(guest);
  });

  it('gives one Firestore journal per account and a new one when the account changes', () => {
    const first = getJournalRepository('u1');

    expect(first).toBeInstanceOf(FirestoreRepository);
    expect(getJournalRepository('u1')).toBe(first);
    expect(getJournalRepository('u2')).not.toBe(first);
  });
});

describe('useJournalRepository', () => {
  it('waits while the app works out who is signed in', async () => {
    const { result } = await renderHook(() => useJournalRepository());

    expect(result.current).toBeNull();
  });

  it('uses the guest journal when signed out and the account journal when signed in', async () => {
    authState.status = 'signed-out';
    const guest = await renderHook(() => useJournalRepository());
    expect(guest.result.current).toBeInstanceOf(LocalRepository);

    authState.status = 'signed-in';
    authState.user = { uid: 'u1' };
    const account = await renderHook(() => useJournalRepository());
    expect(account.result.current).toBeInstanceOf(FirestoreRepository);
  });
});
