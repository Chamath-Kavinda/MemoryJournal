import type { User } from 'firebase/auth';
import { act, renderHook } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/authStore';

import { useGreeting } from './useGreeting';

jest.mock('@/lib/firebase', () => ({ getFirebase: jest.fn() }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn() }));

const at = (hour: number) => new Date(2026, 10, 18, hour, 0);

beforeEach(() => {
  jest.useFakeTimers();
  useAuthStore.setState({ status: 'signed-out', user: null });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useGreeting', () => {
  it('gives a guest the greeting alone, with no name', async () => {
    jest.setSystemTime(at(9));
    const { result } = await renderHook(() => useGreeting());

    expect(result.current).toBe('Good morning');
  });

  it('adds the first name of a signed-in person', async () => {
    jest.setSystemTime(at(20));
    useAuthStore.setState({
      status: 'signed-in',
      user: { uid: 'u1', displayName: 'Sam Perera' } as User,
    });
    const { result } = await renderHook(() => useGreeting());

    expect(result.current).toBe('Good evening, Sam');
  });

  it('says Good night at 23:00 and Good afternoon at 12:00', async () => {
    jest.setSystemTime(at(23));
    const night = await renderHook(() => useGreeting());
    expect(night.result.current).toBe('Good night');

    jest.setSystemTime(at(12));
    const afternoon = await renderHook(() => useGreeting());
    expect(afternoon.result.current).toBe('Good afternoon');
  });

  it('leaves the name out when the account has none', async () => {
    jest.setSystemTime(at(9));
    useAuthStore.setState({ status: 'signed-in', user: { uid: 'u1' } as User });
    const { result } = await renderHook(() => useGreeting());

    expect(result.current).toBe('Good morning');
  });

  it('changes within a minute of the hour changing while the app stays open', async () => {
    jest.setSystemTime(at(11));
    jest.setSystemTime(new Date(2026, 10, 18, 11, 59, 30));
    const { result } = await renderHook(() => useGreeting());
    expect(result.current).toBe('Good morning');

    await act(async () => {
      jest.setSystemTime(new Date(2026, 10, 18, 12, 0, 30));
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe('Good afternoon');
  });
});
