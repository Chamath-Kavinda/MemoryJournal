import { formatCountdown, type GuestDayAccess } from '@memory-journal/core';
import { Lock, LockOpen, PenLine, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GlowFlash } from '@/components/GlowFlash';
import { Icon } from '@/components/Icon';
import { SPACING } from '@/theme/layout';
import { DURATION } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

const BADGE_SIZE = 48;

interface Props {
  /** The lock state of today, or null while it is not known. */
  access: GuestDayAccess | null;
  /** Opens today's page; shown as the Write today button once today is open. */
  onWrite: () => void;
}

/** An icon in a round, raised badge. It is decoration: the text next to it says everything. */
function Badge({ icon, color }: { icon: LucideIcon; color: string }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: BADGE_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.surfaceRaised,
      }}
    >
      <Icon icon={icon} size="control" color={color} />
    </View>
  );
}

/**
 * The Today card of Home (section 15.11). Before 21:00 it shows a Lock, "Opens at 9:00 PM" and a
 * live countdown. At or after 21:00 it shows a LockOpen and a gradient Write today button. When
 * the unlock happens while the card is on screen the open lock fades in with a flash of glow
 * (opacity only, no shake). A guest whose device clock looks wrong sees why today stays closed.
 */
export function TodayCardView({ access, onWrite }: Props) {
  const { palette, scheme } = useTheme();
  const state = access?.state ?? null;

  // Count the unlocks seen while mounted, so the card can react to the moment it opens.
  const previous = useRef(state);
  const [unlocks, setUnlocks] = useState(0);
  useEffect(() => {
    if (previous.current === 'locked' && state === 'open') setUnlocks((count) => count + 1);
    previous.current = state;
  }, [state]);

  if (access === null || access.state === 'future') return null;

  if (access.state === 'clockWrong') {
    return (
      <Card testID="today-card" style={{ borderColor: palette.warning }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <Badge icon={TriangleAlert} color={palette.warning} />
          <View style={{ flex: 1, flexShrink: 1, gap: SPACING.xs }}>
            <Text variant="heading">Today stays closed</Text>
            <Text>Your device clock looks wrong. Fix it to write today.</Text>
          </View>
        </View>
      </Card>
    );
  }

  if (access.state === 'locked') {
    const countdown = formatCountdown(access.msUntilUnlock);
    return (
      <Card testID="today-card">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <Badge icon={Lock} color={palette.neonViolet} />
          <View style={{ flex: 1, flexShrink: 1 }}>
            <Text variant="heading">Opens at 9:00 PM</Text>
            <Text
              variant="title"
              accessibilityRole="timer"
              accessibilityLabel={`Opens in ${countdown}`}
              style={{ color: palette.neonViolet }}
            >
              {countdown}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <View testID="today-card" style={{ position: 'relative' }}>
      <Card active>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <Animated.View
            key={unlocks}
            {...(unlocks > 0 ? { entering: FadeIn.duration(DURATION.base) } : {})}
          >
            <Badge icon={LockOpen} color={palette.success} />
          </Animated.View>
          <View style={{ flex: 1, flexShrink: 1, gap: SPACING.xs }}>
            <Text variant="heading">Today is open</Text>
            <Text style={{ color: palette.muted }}>Write down everything you remember.</Text>
          </View>
        </View>
        <Button
          label="Write today"
          icon={PenLine}
          fullWidth
          onPress={onWrite}
          style={{ marginTop: SPACING.md }}
        />
      </Card>
      <GlowFlash trigger={unlocks} color={palette.neonViolet} scheme={scheme} />
    </View>
  );
}
