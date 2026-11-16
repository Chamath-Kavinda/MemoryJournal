import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

jest.mock('@/lib/firebase', () => ({
  getFirebase: jest.fn(() => {
    throw new Error('startup must not open Firestore');
  }),
  getFirebaseAuth: jest.fn(() => ({ name: 'auth' })),
}));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn() }));

import { getFirebase, getFirebaseAuth } from '@/lib/firebase';

import { startAuthListener, useAuthStore } from './authStore';

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', user: null });
    jest.clearAllMocks();
  });

  it('starts in the loading state', () => {
    expect(useAuthStore.getState().status).toBe('loading');
  });

  it('moves to signed-in when a user arrives', () => {
    const user = { uid: 'u1', email: 'a@example.com' } as User;
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().status).toBe('signed-in');
    expect(useAuthStore.getState().user).toBe(user);
  });

  it('moves to signed-out when the user is cleared', () => {
    useAuthStore.getState().setUser({ uid: 'u1' } as User);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().status).toBe('signed-out');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('listens with Firebase Auth only, so a guest launch never starts Firestore', () => {
    const stop = jest.fn();
    (onAuthStateChanged as jest.Mock).mockReturnValue(stop);

    expect(startAuthListener()).toBe(stop);

    expect(getFirebaseAuth).toHaveBeenCalledTimes(1);
    expect(getFirebase).not.toHaveBeenCalled();
  });

  it('turns the first auth answer into signed-out for a guest', () => {
    (onAuthStateChanged as jest.Mock).mockImplementation(
      (_auth: unknown, callback: (user: User | null) => void) => {
        callback(null);
        return jest.fn();
      },
    );

    startAuthListener();

    expect(useAuthStore.getState().status).toBe('signed-out');
  });
});
