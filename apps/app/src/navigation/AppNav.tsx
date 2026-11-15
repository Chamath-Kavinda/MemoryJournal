import { usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { HAS_KEYBOARD_SHORTCUTS, shortcutLabel } from './shortcuts';

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

/**
 * The side navigation shown on wide windows (the desktop app and large browser windows). It is
 * a navigation landmark of links, so a screen reader can jump to it and Tab walks through it.
 * On the web build each item also names its Alt+number shortcut.
 */
export function SideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { palette } = useTheme();
  return (
    <View
      role="navigation"
      accessibilityLabel="Main"
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
      {NAV_ITEMS.map((item, index) => {
        const current = isCurrent(pathname, item.href);
        const shortcut = HAS_KEYBOARD_SHORTCUTS ? shortcutLabel(index) : '';
        const color = current ? palette.onAccent : palette.text;
        return (
          <Pressable
            key={item.href}
            accessibilityRole="link"
            accessibilityLabel={item.label}
            accessibilityHint={shortcut === '' ? undefined : `Shortcut ${shortcut}`}
            accessibilityState={{ selected: current }}
            onPress={() => router.push(item.href)}
            style={{
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: current ? palette.accent : 'transparent',
            }}
          >
            <Text style={{ color, fontSize: 16, fontWeight: current ? '600' : '500' }}>
              {item.label}
            </Text>
            {shortcut !== '' ? (
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ color: current ? palette.onAccent : palette.muted, fontSize: 12 }}
              >
                {shortcut}
              </Text>
            ) : null}
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
    <View
      role="navigation"
      accessibilityLabel="Sections"
      style={{ alignItems: 'center', gap: 4, marginTop: 8 }}
    >
      {NAV_ITEMS.filter((item) => item.href !== '/home').map((item) => (
        <Pressable
          key={item.href}
          accessibilityRole="link"
          accessibilityLabel={item.label}
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
