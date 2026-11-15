import { Switch, View } from 'react-native';

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
  const dark = useTheme().scheme === 'dark';
  const muted = dark ? '#8e8e93' : '#6c6c70';

  let hint = '';
  if (disabled) hint = 'The first pass has nothing earlier to compare with.';
  else if (value && readOnlyNote) hint = 'Showing the saved pass. Switch off to keep writing.';

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: dark ? '#f2f2f2' : '#1c1c1e', fontSize: 15 }}>
          Highlight additions
        </Text>
        <Switch
          accessibilityLabel="Highlight additions"
          value={value && !disabled}
          disabled={disabled}
          onValueChange={onChange}
        />
      </View>
      {hint !== '' ? <Text style={{ color: muted, fontSize: 13 }}>{hint}</Text> : null}
    </View>
  );
}
