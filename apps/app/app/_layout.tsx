import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { startAuthListener, useAuthStore } from '@/features/auth/authStore';
import { useProfileSync } from '@/features/profile/useProfileSync';
import { useDesktopReminder } from '@/features/reminder/useDesktopReminder';
import { useReminder } from '@/features/reminder/useReminder';

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => startAuthListener(), []);
  useProfileSync();
  useReminder();
  useDesktopReminder();

  useEffect(() => {
    if (status === 'loading') return;
    const onSignIn = segments[0] === 'sign-in';
    if (status === 'signed-out' && !onSignIn) router.replace('/sign-in');
    if (status === 'signed-in' && onSignIn) router.replace('/home');
  }, [status, segments, router]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}
