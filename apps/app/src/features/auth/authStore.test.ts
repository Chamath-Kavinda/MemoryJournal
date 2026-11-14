import type { User } from 'firebase/auth';

jest.mock('@/lib/firebase', () => ({ getFirebase: jest.fn() }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn() }));

import { useAuthStore } from './authStore';

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', user: null });
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
});
