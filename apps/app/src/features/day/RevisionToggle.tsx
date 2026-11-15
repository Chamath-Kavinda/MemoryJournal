import type { RevisionOption, RevisionSelection } from '@memory-journal/core';
import { Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  options: RevisionOption[];
  selected: RevisionSelection;
  onSelect: (selection: RevisionSelection) => void;
}

/**
 * Switches between the passes of a day: Latest, 1st, 2nd and so on. Choosing a pass shows
 * the day as it was then. A day with a single pass has no options, so nothing is drawn.
 */
export function RevisionToggle({ options, selected, onSelect }: Props) {
  const dark = useTheme().scheme === 'dark';
  if (options.length === 0) return null;

  return (
    <View
      style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 }}
      accessibilityRole="tablist"
      accessibilityLabel="Revisions"
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
          {options.map((option) => {
            const active = option.key === selected;
            return (
              <Pressable
                key={String(option.key)}
                accessibilityRole="tab"
                accessibilityLabel={option.key === 'latest' ? 'Latest' : `${option.label} pass`}
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(option.key)}
                style={{
                  minHeight: 36,
                  paddingHorizontal: 14,
                  justifyContent: 'center',
                  borderRadius: 18,
                  backgroundColor: active ? '#0a84ff' : dark ? '#2c2c2e' : '#e9e9ee',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: active ? '600' : '400',
                    color: active ? '#ffffff' : dark ? '#e5e5ea' : '#1c1c1e',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
