import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import {
  GraduationCap,
  House,
  LibraryBig,
  Settings,
  Tag,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, STROKE } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { MIN_TARGET, RADIUS } from '@/theme/layout';
import { GRADIENT_END, GRADIENT_START } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';
import { useLayout } from '@/theme/useLayout';

import { HAS_KEYBOARD_SHORTCUTS, shortcutLabel } from './shortcuts';

export interface NavItem {
  /** The name a screen reader reads and the tooltip shows. There is no visible text label. */
  label: string;
  href: '/home' | '/tags' | '/library' | '/insights' | '/learn' | '/settings';
  icon: LucideIcon;
}

/** The five main sections, in the order of the bottom bar. */
export const TAB_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/home', icon: House },
  { label: 'Tags', href: '/tags', icon: Tag },
  { label: 'Library', href: '/library', icon: LibraryBig },
  { label: 'Insights', href: '/insights', icon: TrendingUp },
  { label: 'Learn', href: '/learn', icon: GraduationCap },
];

export const SETTINGS_ITEM: NavItem = { label: 'Settings', href: '/settings', icon: Settings };

/** The five sections plus Settings: Alt+1 to Alt+6 (section 15.8). */
export const NAV_ITEMS: readonly NavItem[] = [...TAB_ITEMS, SETTINGS_ITEM];

/** Height of the bottom bar without the bottom safe area. */
export const TAB_BAR_HEIGHT = 56;

/** Height of the bottom bar on a phone held sideways (window height under 500), section 15.9. */
export const SHORT_TAB_BAR_HEIGHT = 48;

/** Width of the sidebar. */
export const SIDEBAR_WIDTH = 72;

/** Whether a route belongs to a navigation item, so "/tags/new" still marks Tags as current. */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The bottom bar is shown on the five tab screens only (section 15.8), not on screens opened from them. */
export function isTabScreen(pathname: string): boolean {
  return TAB_ITEMS.some((item) => item.href === pathname);
}

/** A name that appears on hover, on keyboard focus and after a long press. */
function useTooltip() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  return {
    visible,
    show: () => setVisible(true),
    hide: () => setVisible(false),
    /** A long press on a phone: show the name for a moment. */
    flash: () => {
      setVisible(true);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 1500);
    },
  };
}

const TOOLTIP_WIDTH = 160;

function Tooltip({ text, placement }: { text: string; placement: 'above' | 'right' }) {
  const { palette } = useTheme();
  const position =
    placement === 'above'
      ? { bottom: MIN_TARGET + 8, left: (MIN_TARGET - TOOLTIP_WIDTH) / 2, alignItems: 'center' }
      : { left: MIN_TARGET + 8, top: (MIN_TARGET - 32) / 2, alignItems: 'flex-start' };
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', width: TOOLTIP_WIDTH }, position as object]}
    >
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surfaceRaised,
        }}
      >
        <Text style={{ color: palette.text, fontSize: 13 }}>{text}</Text>
      </View>
    </View>
  );
}

interface NavButtonProps {
  item: NavItem;
  /** Position in NAV_ITEMS, which decides the Alt+number shortcut. */
  index: number;
  current: boolean;
  placement: 'above' | 'right';
  role: 'tab' | 'link';
  onPress: () => void;
  /** A phone held sideways: the target shrinks to the minimum so the bar can be shorter. */
  short?: boolean;
}

/** One icon-only navigation item, at least 48 by 48 on Android and 44 by 44 elsewhere. */
function NavButton({ item, index, current, placement, role, onPress, short }: NavButtonProps) {
  const { palette, scheme } = useTheme();
  const tooltip = useTooltip();
  const shortcut = HAS_KEYBOARD_SHORTCUTS ? shortcutLabel(index) : '';
  const color = current ? palette.accent : palette.muted;
  // A soft glow under the active icon, only where the platform draws it well and the theme has glows.
  const glow =
    current && scheme === 'dark' && Platform.OS !== 'android'
      ? {
          shadowColor: palette.accent,
          shadowOpacity: 0.5,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }
      : null;
  return (
    <View
      style={{ alignItems: 'center', justifyContent: 'center', zIndex: tooltip.visible ? 10 : 0 }}
    >
      <PressableScale
        testID={`nav-${item.label.toLowerCase()}`}
        accessibilityRole={role}
        accessibilityLabel={item.label}
        accessibilityState={{ selected: current }}
        onPress={onPress}
        onLongPress={tooltip.flash}
        onHoverIn={tooltip.show}
        onHoverOut={tooltip.hide}
        onFocus={tooltip.show}
        onBlur={tooltip.hide}
        innerStyle={[
          {
            width: short ? MIN_TARGET : MIN_TARGET + 4,
            height: short ? MIN_TARGET : MIN_TARGET + 4,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: RADIUS.pill,
          },
          glow,
        ]}
      >
        {current ? (
          <View
            testID={`nav-${item.label.toLowerCase()}-indicator`}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: RADIUS.pill, overflow: 'hidden', opacity: 0.28 },
            ]}
          >
            <LinearGradient
              colors={[palette.primaryStart, palette.primaryEnd]}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}
        <Icon
          icon={item.icon}
          size="control"
          color={color}
          strokeWidth={current ? STROKE.active : STROKE.normal}
        />
      </PressableScale>
      {tooltip.visible ? (
        <Tooltip
          text={shortcut === '' ? item.label : `${item.label}, ${shortcut}`}
          placement={placement}
        />
      ) : null}
    </View>
  );
}

/**
 * The side navigation shown on wide windows (the desktop app and large browser windows): the
 * five sections at the top and Settings at the bottom, icons only. Hovering or focusing an icon
 * shows its name and its Alt+number shortcut.
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
        width: SIDEBAR_WIDTH,
        paddingVertical: 16,
        alignItems: 'center',
        gap: 8,
        borderRightWidth: 1,
        borderRightColor: palette.border,
        backgroundColor: palette.surface,
        zIndex: 1,
      }}
    >
      {TAB_ITEMS.map((item, index) => (
        <NavButton
          key={item.href}
          item={item}
          index={index}
          current={isCurrent(pathname, item.href)}
          placement="right"
          role="link"
          onPress={() => router.push(item.href)}
        />
      ))}
      <View style={{ flex: 1 }} />
      <NavButton
        item={SETTINGS_ITEM}
        index={NAV_ITEMS.length - 1}
        current={isCurrent(pathname, SETTINGS_ITEM.href)}
        placement="right"
        role="link"
        onPress={() => router.push(SETTINGS_ITEM.href)}
      />
    </View>
  );
}

/**
 * The bottom bar of phones and tablets: five icon-only tabs, 56 tall plus the bottom safe area
 * (48 on a phone held sideways). The active tab has a gradient pill, a neon icon and a thicker
 * stroke, so the state is clear without any text. Screen readers read each label and announce
 * the active tab as selected.
 */
export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { shortScreen } = useLayout();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Main"
      style={{
        height: (shortScreen ? SHORT_TAB_BAR_HEIGHT : TAB_BAR_HEIGHT) + insets.bottom,
        paddingBottom: insets.bottom,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: palette.border,
        backgroundColor: palette.surface,
        zIndex: 1,
      }}
    >
      {TAB_ITEMS.map((item, index) => (
        <NavButton
          key={item.href}
          item={item}
          index={index}
          current={isCurrent(pathname, item.href)}
          placement="above"
          role="tab"
          short={shortScreen}
          onPress={() => router.replace(item.href)}
        />
      ))}
    </View>
  );
}
