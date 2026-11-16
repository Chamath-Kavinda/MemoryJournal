import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ThemeFade } from '@/components/ThemeFade';
import { ConfirmProvider } from '@/components/useConfirm';
import { startAuthListener, useAuthStore } from '@/features/auth/authStore';
import { useRecordLastSeen } from '@/features/day/useRecordLastSeen';

import { useProfileSync } from '@/features/profile/useProfileSync';
import { useDesktopReminder } from '@/features/reminder/useDesktopReminder';
import { useReminder } from '@/features/reminder/useReminder';
import { reminderWanted, useSettings } from '@/features/settings/useSettings';
import { BottomTabBar, NAV_ITEMS, SideNav, isTabScreen } from '@/navigation/AppNav';
import { useNavShortcuts } from '@/navigation/shortcuts';
import { useFocusRing } from '@/theme/focusRing';
import { useAppFonts } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useLayout } from '@/theme/useLayout';

/** The page background, the status bar and, on wide windows, the side navigation. */
function Shell({ showNav }: { showNav: boolean }) {
  const { palette, scheme } = useTheme();
  const { sizeClass } = useLayout();
  const router = useRouter();
  const pathname = usePathname();
  const wide = sizeClass === 'expanded';
  const sideNav = showNav && wide;
  // The bottom bar shows on the five tab screens only; Day, Settings and the other screens hide it.
  const bottomBar = showNav && !wide && isTabScreen(pathname);
  useFocusRing(palette.accent);
  // Alt+1 to Alt+6 jump between the main sections, on the web build and in the desktop app.
  useNavShortcuts(
    NAV_ITEMS.length,
    (index) => router.push(NAV_ITEMS[index]?.href ?? '/home'),
    showNav,
  );
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {sideNav ? <SideNav /> : null}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        {bottomBar ? <BottomTabBar /> : null}
      </View>
      {/* Melts the old background into the new one when the theme changes (section 15.16). */}
      <ThemeFade />
    </View>
  );
}

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();
  const settings = useSettings();
  const reminderOn = reminderWanted(settings);
  // The fonts are bundled files, so this resolves quickly and never waits for the network.
  const fontsReady = useAppFonts();

  useEffect(() => startAuthListener(), []);
  useProfileSync();
  useReminder(reminderOn);
  useDesktopReminder(reminderOn);
  useRecordLastSeen();

  useEffect(() => {
    if (status === 'loading') return;
    // A guest is never sent to sign-in. Someone who signs in from that screen goes back to Home.
    if (status === 'signed-in' && segments[0] === 'sign-in') router.replace('/home');
  }, [status, segments, router]);

  return (
    <ThemeProvider preference={settings.settings.theme}>
      {/* Every delete, remove, discard and sign-out asks through this one dialog. */}
      <ConfirmProvider>
        {status === 'loading' || !fontsReady ? (
          <LoadingShell />
        ) : (
          <Shell showNav={segments[0] !== 'sign-in'} />
        )}
      </ConfirmProvider>
    </ThemeProvider>
  );
}

function LoadingShell() {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.background,
      }}
    >
      <ActivityIndicator color={palette.accent} />
    </View>
  );
}
