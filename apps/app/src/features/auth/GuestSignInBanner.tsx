import { Pressable, View } from 'react-native';
import { create } from 'zustand';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { useAuthStore } from './authStore';

interface BannerState {
  dismissed: boolean;
  dismiss: () => void;
}

/** Whether the guest closed the banner. It lives in memory, so it comes back next launch. */
export const useGuestBannerStore = create<BannerState>((set) => ({
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
}));

interface Props {
  onSignIn: () => void;
}

/**
 * A gentle note on Home for a guest: the journal is on this device only, and signing in backs
 * it up (section 15.6). It shows nothing for a signed-in user, while the app is still working
 * out who is signed in, or after it was dismissed for the session.
 */
export function GuestSignInBanner({ onSignIn }: Props) {
  const { palette } = useTheme();
  const status = useAuthStore((s) => s.status);
  const dismissed = useGuestBannerStore((s) => s.dismissed);
  const dismiss = useGuestBannerStore((s) => s.dismiss);
  if (status !== 'signed-out' || dismissed) return null;

  return (
    <View
      accessibilityRole="summary"
      style={{
        margin: 16,
        padding: 14,
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.accent,
      }}
    >
      <Text style={{ fontWeight: '600' }}>Stored on this device only</Text>
      <Text>Sign in to back it up. Uninstalling the app removes a guest journal.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={onSignIn}
          style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }}
        >
          <Text style={{ color: palette.accent, fontWeight: '600' }}>Sign in</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={dismiss}
          style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }}
        >
          <Text>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}
