import { Highlighter } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Toggle } from '@/components/Toggle';
import { SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
  /** True when the selected pass has no earlier pass to compare with. */
  disabled: boolean;
  /** True while the Latest pass is selected and could be edited, to explain the read-only view. */
  readOnlyNote: boolean;
}

/** The Highlight additions switch under the revision toggle (section 5.3). */
export function HighlightSwitch({ value, onChange, disabled, readOnlyNote }: Props) {
  const { palette } = useTheme();

  let hint = '';
  if (disabled) hint = 'The first pass has nothing earlier to compare with.';
  else if (value && readOnlyNote) hint = 'Showing the saved pass. Switch off to keep writing.';

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        gap: SPACING.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <Icon icon={Highlighter} color={palette.accent} />
          <Text variant="body">Highlight additions</Text>
        </View>
        <Toggle
          accessibilityLabel="Highlight additions"
          value={value && !disabled}
          disabled={disabled}
          onValueChange={onChange}
        />
      </View>
      {hint !== '' ? (
        <Text variant="caption" style={{ color: palette.muted }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
