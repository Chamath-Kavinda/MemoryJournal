import { usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

export interface NavItem {
  label: string;
  href: '/home' | '/tags' | '/library' | '/insights' | '/learn' | '/settings';
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/home' },
  { label: 'Tags', href: '/tags' },
  { label: 'Library', href: '/library' },
  { label: 'Insights', href: '/insights' },
  { label: 'Learn', href: '/learn' },
  { label: 'Settings', href: '/settings' },
];

/** Whether a route belongs to a navigation item, so "/tags/new" still marks Tags as current. */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The side navigation shown on wide windows (the desktop app and large browser windows). */
export function SideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { palette } = useTheme();
  return (
    <View
      accessibilityRole="menu"
      style={{
        width: 200,
        paddingVertical: 16,
        paddingHorizontal: 8,
        gap: 4,
        borderRightWidth: 1,
        borderRightColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <Pressable
            key={item.href}
            accessibilityRole="menuitem"
            accessibilityState={{ selected: current }}
            onPress={() => router.push(item.href)}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: current ? palette.accent : 'transparent',
            }}
          >
            <Text
              style={{
                color: current ? palette.onAccent : palette.text,
                fontSize: 16,
                fontWeight: current ? '600' : '500',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The navigation shown under the calendar on narrow screens. */
export function LinkList() {
  const router = useRouter();
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
      {NAV_ITEMS.filter((item) => item.href !== '/home').map((item) => (
        <Pressable
          key={item.href}
          accessibilityRole="button"
          onPress={() => router.push(item.href)}
          style={{ minHeight: 44, minWidth: 120, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: palette.accent, fontSize: 17, fontWeight: '500' }}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
