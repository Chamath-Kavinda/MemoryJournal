import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalRepository, type JournalRepository } from '@memory-journal/core';

import { useAuthStore } from '@/features/auth/authStore';

import { FirestoreRepository } from './firestoreRepository';

let guestRepository: LocalRepository | null = null;
let accountRepository: { uid: string; repository: FirestoreRepository } | null = null;

/**
 * The journal for whoever is using the app: the on-device guest journal when nobody is signed
 * in, or the signed-in account's Firestore journal. Each is created once and then reused, so every
 * screen shares one set of listeners. Signing in as someone else creates a new repository for
 * that account; the old one stops listening once its last listener leaves.
 */
export function getJournalRepository(uid: string | null): JournalRepository {
  if (!uid) {
    guestRepository ??= new LocalRepository(AsyncStorage);
    return guestRepository;
  }
  if (accountRepository?.uid !== uid) {
    accountRepository = { uid, repository: new FirestoreRepository(uid) };
  }
  return accountRepository.repository;
}

/** The repository for the current journal, or null while the app is still working out who signed in. */
export function useJournalRepository(): JournalRepository | null {
  const status = useAuthStore((s) => s.status);
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  return status === 'loading' ? null : getJournalRepository(uid);
}

/** Drops the signed-in account's repository after sign-out, so the next sign-in starts clean. */
export function forgetAccountRepository(): void {
  accountRepository = null;
}

/** Forgets the cached repositories, for tests. */
export function resetJournalRepositories(): void {
  guestRepository = null;
  accountRepository = null;
}
