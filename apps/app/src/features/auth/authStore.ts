import { onAuthStateChanged, type User } from 'firebase/auth';
import { create } from 'zustand';

import { getFirebaseAuth } from '@/lib/firebase';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

type AuthState = {
  status: AuthStatus;
  user: User | null;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  setUser: (user) => set({ user, status: user ? 'signed-in' : 'signed-out' }),
}));

/**
 * Starts the Firebase Auth listener once. Returns the unsubscribe function. It uses Auth only,
 * so a guest's launch never starts Firestore (docs section 15.6, point 2).
 */
export function startAuthListener(): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    useAuthStore.getState().setUser(user);
  });
}
