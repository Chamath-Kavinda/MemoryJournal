import { fireEvent, render, screen } from '@testing-library/react-native';
import type { User } from 'firebase/auth';

jest.mock('@/lib/firebase', () => ({ getFirebase: jest.fn() }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn() }));

import { useAuthStore } from './authStore';
import { GuestSignInBanner, useGuestBannerStore } from './GuestSignInBanner';

describe('GuestSignInBanner', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'signed-out', user: null });
    useGuestBannerStore.setState({ dismissed: false });
  });

  it('tells a guest the journal is only on this device', async () => {
    await render(<GuestSignInBanner onSignIn={jest.fn()} />);

    expect(screen.getByText('Stored on this device only')).toBeTruthy();
    expect(screen.getByLabelText('Sign in')).toBeTruthy();
  });

  it('opens sign-in when Sign in is pressed', async () => {
    const onSignIn = jest.fn();
    await render(<GuestSignInBanner onSignIn={onSignIn} />);

    await fireEvent.press(screen.getByLabelText('Sign in'));

    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('goes away when dismissed and stays away for the session', async () => {
    const { rerender } = await render(<GuestSignInBanner onSignIn={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Stored on this device only')).toBeNull();

    await rerender(<GuestSignInBanner onSignIn={jest.fn()} />);
    expect(screen.queryByText('Stored on this device only')).toBeNull();
  });

  it('shows nothing for a signed-in user', async () => {
    useAuthStore.setState({ status: 'signed-in', user: { uid: 'u1' } as User });
    await render(<GuestSignInBanner onSignIn={jest.fn()} />);

    expect(screen.queryByText('Stored on this device only')).toBeNull();
  });

  it('shows nothing while the app is still working out who is signed in', async () => {
    useAuthStore.setState({ status: 'loading', user: null });
    await render(<GuestSignInBanner onSignIn={jest.fn()} />);

    expect(screen.queryByText('Stored on this device only')).toBeNull();
  });
});
