import { fireEvent, render, screen } from '@testing-library/react-native';
import type { User } from 'firebase/auth';

jest.mock('@/lib/firebase', () => ({ getFirebase: jest.fn() }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn() }));

import { useAuthStore } from './authStore';
import { SignInPill } from './SignInPill';

describe('SignInPill', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'signed-out', user: null });
  });

  it('shows Sign in for a guest and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<SignInPill onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows nothing for a signed-in user', async () => {
    useAuthStore.setState({ status: 'signed-in', user: { uid: 'u1' } as User });
    await render(<SignInPill onPress={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('shows nothing while the app is still working out who is signed in', async () => {
    useAuthStore.setState({ status: 'loading', user: null });
    await render(<SignInPill onPress={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });
});
