import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';

import { ConfirmProvider } from '@/components/useConfirm';
import { startAuthListener, useAuthStore } from '@/features/auth/authStore';
import { useProfileSync } from '@/features/profile/useProfileSync';
import { useDesktopReminder } from '@/features/reminder/useDesktopReminder';
import { useReminder } from '@/features/reminder/useReminder';
import { reminderWanted, useSettings } from '@/features/settings/useSettings';
import { BottomTabBar, NAV_ITEMS, SideNav, isTabScreen } from '@/navigation/AppNav';
import { useNavShortcuts } from '@/navigation/shortcuts';
import { useFocusRing } from '@/theme/focusRing';
import { useAppFonts } from '@/theme/fonts';
import { isWide } from '@/theme/palette';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

/** The page background, the status bar and, on wide windows, the side navigation. */
function Shell({ showNav }: { showNav: boolean }) {
  const { palette, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const sideNav = showNav && isWide(width);
  // The bottom bar shows on the five tab screens only; Day, Settings and the other screens hide it.
  const bottomBar = showNav && !isWide(width) && isTabScreen(pathname);
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

  useEffect(() => {
    if (status === 'loading') return;
    const onSignIn = segments[0] === 'sign-in';
    if (status === 'signed-out' && !onSignIn) router.replace('/sign-in');
    if (status === 'signed-in' && onSignIn) router.replace('/home');
  }, [status, segments, router]);

  return (
    <ThemeProvider preference={settings.settings.theme}>
      {/* Every delete, remove, discard and sign-out asks through this one dialog. */}
      <ConfirmProvider>
        {status === 'loading' || !fontsReady ? (
          <LoadingShell />
        ) : (
          <Shell showNav={status === 'signed-in' && segments[0] !== 'sign-in'} />
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
