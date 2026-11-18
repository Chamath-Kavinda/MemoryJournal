import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/authStore';

import { greetingFor } from './greetingText';

const MINUTE = 60_000;

/** The local hour, read again every minute so the greeting changes while the app stays open. */
function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), MINUTE);
    return () => clearInterval(timer);
  }, []);
  return hour;
}

/**
 * The greeting that is the title of Home (v0.2.5, section 6): Good morning, afternoon, evening or
 * night, followed by the first name of the signed-in person. A guest, or an account with no name,
 * gets the greeting alone. Display only: it never touches the 21:00 lock, the streak or the score.
 */
export function useGreeting(): string {
  const hour = useHour();
  const signedIn = useAuthStore((s) => s.status === 'signed-in');
  const displayName = useAuthStore((s) => s.user?.displayName);
  return greetingFor(hour, signedIn ? displayName : null);
}
