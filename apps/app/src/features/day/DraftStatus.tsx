import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import type { DraftSaveState } from './useDayDraft';

/**
 * One quiet line above the writer: says when the draft is safe on the device, or when it is
 * not. Its height is reserved so the page does not jump while typing.
 */
export function DraftStatus({ state }: { state: DraftSaveState }) {
  const { palette } = useTheme();
  const failed = state === 'error';
  const visible = state === 'saved' || failed;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 16,
        minHeight: 20,
        marginBottom: 12,
      }}
    >
      {visible ? (
        <Text
          accessibilityRole={failed ? 'alert' : undefined}
          style={{ fontSize: 13, color: failed ? palette.danger : palette.muted }}
        >
          {failed
            ? 'Could not save your draft on this device. Keep this screen open.'
            : 'Draft saved on this device.'}
        </Text>
      ) : null}
    </View>
  );
}
