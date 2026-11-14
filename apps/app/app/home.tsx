import { Pressable, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/authStore';
import { signOut } from '@/platform/auth/google';

// Placeholder until the calendar arrives in Milestone 3 (commit 17).
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Text>Signed in as {user?.email ?? 'unknown'}</Text>
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </View>
  );
}
