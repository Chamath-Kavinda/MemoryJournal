import { CloudOff, LogIn } from 'lucide-react-native';
import { View } from 'react-native';
import { create } from 'zustand';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { SPACING } from '@/theme/layout';
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
      style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.md }}
    >
      <FadeUp>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md }}>
            <Icon icon={CloudOff} size="control" color={palette.neonViolet} />
            <View style={{ flex: 1, flexShrink: 1, gap: SPACING.xs }}>
              <Text variant="heading">Stored on this device only</Text>
              <Text style={{ color: palette.muted }}>
                Sign in to back it up. Uninstalling the app removes a guest journal.
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: SPACING.sm,
              marginTop: SPACING.md,
            }}
          >
            <Button label="Sign in" icon={LogIn} onPress={onSignIn} />
            <Button label="Dismiss" variant="ghost" onPress={dismiss} />
          </View>
        </Card>
      </FadeUp>
    </View>
  );
}
