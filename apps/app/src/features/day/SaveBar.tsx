import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  /** True when the text on screen differs from the latest saved pass. */
  canSave: boolean;
  /** True when the day already has at least one saved pass. */
  hasSaved: boolean;
  saving: boolean;
  failed: boolean;
  /** True while a save is on this device but not yet confirmed by the server. */
  pendingSync: boolean;
  onSave: () => void;
}

/** The Save button of the writer, with one quiet line that says where the text stands. */
export function SaveBar({ canSave, hasSaved, saving, failed, pendingSync, onSave }: Props) {
  const { palette } = useTheme();
  // Offline, a save waits for the server for a long time; it must not block more saving.
  const busy = saving && !pendingSync;
  const disabled = !canSave || busy;

  let message = '';
  if (failed) message = 'Could not save. Your text is still on this device.';
  else if (busy) message = 'Saving…';
  else if (pendingSync) message = 'Saved on this device. It will sync when you are online.';
  else if (!canSave && hasSaved) message = 'All changes saved.';

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onSave}
        style={{
          minHeight: 44,
          paddingHorizontal: 20,
          justifyContent: 'center',
          borderRadius: 22,
          backgroundColor: disabled ? palette.surface : palette.accent,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: disabled ? palette.muted : palette.onAccent,
          }}
        >
          Save
        </Text>
      </Pressable>
      {/* A polite live region, so a screen reader announces "All changes saved" after saving. */}
      <Text
        accessibilityRole={failed ? 'alert' : undefined}
        accessibilityLiveRegion="polite"
        style={{ flex: 1, fontSize: 13, color: failed ? palette.danger : palette.muted }}
      >
        {message}
      </Text>
    </View>
  );
}
