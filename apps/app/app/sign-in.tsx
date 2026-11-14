import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { signInWithGoogle } from '@/platform/auth/google';

export default function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.status === 'error') setError(result.message);
    setBusy(false);
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: '600' }}>Memory Journal</Text>
      <Text style={{ textAlign: 'center', maxWidth: 360 }}>
        Recall your day each night and train your memory.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        disabled={busy}
        onPress={onPress}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 8,
          borderWidth: 1,
          minWidth: 220,
          alignItems: 'center',
        }}
      >
        {busy ? <ActivityIndicator /> : <Text>Continue with Google</Text>}
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: '#b00020', textAlign: 'center' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
