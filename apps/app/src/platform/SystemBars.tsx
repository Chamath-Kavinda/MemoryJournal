import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Makes the Android system navigation bar follow the active theme (section 16.3). The app draws
 * edge to edge, so the bar shows the window background: that is set to the `background` token
 * whenever the theme changes, and the bar buttons are light on dark and dark on light.
 * It renders nothing and does nothing on iOS, web and Windows. A failure is caught and ignored,
 * because a wrong bar colour must never stop the app.
 */
export function SystemBars() {
  const { palette, scheme } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      SystemUI.setBackgroundColorAsync(palette.background).catch(() => undefined);
    } catch {
      // Ignored: see the comment above.
    }
  }, [palette.background]);

  if (Platform.OS !== 'android') return null;
  // In this API 'dark' means a dark bar with light buttons, and 'light' a light bar with dark ones.
  return <NavigationBar style={scheme === 'dark' ? 'dark' : 'light'} />;
}
