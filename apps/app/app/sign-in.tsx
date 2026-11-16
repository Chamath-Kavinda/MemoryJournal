import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { signInWithGoogle } from '@/platform/auth/google';

export default function SignInScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.status === 'error') setError(result.message);
    setBusy(false);
  }

  // Signing in is optional, so this screen can always be left for Home.
  function onNotNow() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '600' }}>
        Memory Journal
      </Text>
      <Text style={{ textAlign: 'center', maxWidth: 360 }}>
        Recall your day each night and train your memory.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onPress}
        style={{
          minHeight: 48,
          paddingHorizontal: 20,
          borderRadius: 8,
          borderWidth: 1,
          // A visible edge in both themes; without a colour the border is black on a dark page.
          borderColor: palette.accent,
          minWidth: 220,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {busy ? <ActivityIndicator color={palette.accent} /> : <Text>Continue with Google</Text>}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Not now"
        onPress={onNotNow}
        style={{
          minHeight: 48,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: palette.accent }}>Not now</Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger, textAlign: 'center' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
