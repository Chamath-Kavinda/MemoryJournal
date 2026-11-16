import { useRouter } from 'expo-router';
import { Settings, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { CONTENT_MAX_WIDTH, isWide } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  title: string;
  /** A decorative icon drawn before the title, for example Tag on the Tags screen. */
  icon?: LucideIcon;
  /** Extra controls shown before the Settings gear. */
  trailing?: ReactNode;
}

/**
 * The top bar of the five tab screens (section 15.8): the title on the left and the Settings
 * gear at the top right. On wide windows the sidebar already holds Settings, so the gear is left out.
 */
export function TabHeader({ title, icon, trailing }: Props) {
  const router = useRouter();
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingLeft: 16,
        paddingRight: 8,
        paddingTop: 8,
      }}
    >
      <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Icon icon={icon} size="control" color={palette.neonViolet} /> : null}
        <Text
          accessibilityRole="header"
          style={{ flexShrink: 1, color: palette.text, fontSize: 22, fontWeight: '700' }}
        >
          {title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {trailing}
        {isWide(width) ? null : (
          <IconButton
            icon={Settings}
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
          />
        )}
      </View>
    </View>
  );
}
