import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuthStore } from '@/features/auth/authStore';
import { SPACING } from '@/theme/layout';
import { Text } from '@/theme/themed';

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
 * The line at the top of Home: Good morning, afternoon, evening or night, followed by the first
 * name of the signed-in person. A guest, or an account with no name, gets the greeting alone.
 */
export function Greeting() {
  const hour = useHour();
  const signedIn = useAuthStore((s) => s.status === 'signed-in');
  const displayName = useAuthStore((s) => s.user?.displayName);
  const text = greetingFor(hour, signedIn ? displayName : null);

  return (
    <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.sm }}>
      <Text variant="title" accessibilityRole="header" testID="home-greeting">
        {text}
      </Text>
    </View>
  );
}
