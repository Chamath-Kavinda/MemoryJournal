import { Save } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { easeIn } from '@/motion/easing';
import { useReduceMotion } from '@/motion/useReduceMotion';
import { BORDER_WIDTH, SPACING } from '@/theme/layout';
import { BAR_SLIDE_DISTANCE, DURATION, SPRING } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

/** Space a scrolling screen leaves at its bottom so the bar never covers the last text. */
export const SAVE_BAR_CLEARANCE = 112;

interface Props {
  /** True when the text on screen differs from the latest saved pass. */
  canSave: boolean;
  saving: boolean;
  failed: boolean;
  /** True while a save is on this device but not yet confirmed by the server. */
  pendingSync: boolean;
  onSave: () => void;
}

/**
 * The sticky bottom bar of the writer. It slides up with the shared spring when there is
 * something to save, or a message to show about a save, and slides away when everything is
 * saved. A snackbar confirms a finished save. Place it at the bottom of a parent that fills
 * the screen.
 */
export function SaveBar({ canSave, saving, failed, pendingSync, onSave }: Props) {
  const { palette } = useTheme();
  const reduce = useReduceMotion();
  // Offline, a save waits for the server for a long time; it must not block more saving.
  const busy = saving && !pendingSync;
  const visible = canSave || saving || failed || pendingSync;

  const progress = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    const target = visible ? 1 : 0;
    if (reduce) progress.value = withTiming(target, { duration: DURATION.reduced });
    else if (visible) progress.value = withSpring(1, SPRING);
    else progress.value = withTiming(0, { duration: DURATION.base, easing: easeIn });
  }, [visible, reduce, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, progress.value)),
    transform: [{ translateY: reduce ? 0 : (1 - progress.value) * BAR_SLIDE_DISTANCE }],
  }));

  let message = '';
  if (failed) message = 'Could not save. Your text is still on this device.';
  else if (busy) message = 'Saving…';
  else if (pendingSync) message = 'Saved on this device. It will sync when you are online.';

  return (
    <Animated.View
      testID="save-bar"
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderTopWidth: BORDER_WIDTH,
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
        animated,
      ]}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          padding: SPACING.md,
        }}
      >
        <Button label="Save" icon={Save} disabled={!canSave} loading={busy} onPress={onSave} />
        {/* A polite live region, so a screen reader announces how the save is going. */}
        <Text
          variant="caption"
          accessibilityRole={failed ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={{ flex: 1, color: failed ? palette.danger : palette.muted }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
