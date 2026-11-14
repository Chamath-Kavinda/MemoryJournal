import { onAuthStateChanged, type User } from 'firebase/auth';
import { create } from 'zustand';

import { getFirebase } from '@/lib/firebase';

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

/** Starts the Firebase listener once. Returns the unsubscribe function. */
export function startAuthListener(): () => void {
  return onAuthStateChanged(getFirebase().auth, (user) => {
    useAuthStore.getState().setUser(user);
  });
}
