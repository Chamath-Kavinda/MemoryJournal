import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Makes the Android system navigation buttons follow the active theme (v0.2.5, section 5).
 *
 * The app draws edge to edge, so it paints the colour behind the buttons itself (the tab bar and
 * the screens use `surface` and `background`); the native window background is kept equal to the
 * `background` token for rotation and start. This component sets only the style of the buttons.
 *
 * The `style` prop of `NavigationBar` is the colour of the BUTTONS, not of the bar: `light` means
 * light buttons (for a dark theme) and `dark` means dark buttons (for a light theme). v0.2.4 had
 * this the wrong way round, which gave dark buttons on a dark background. `auto` is not used
 * because it follows the phone's theme and the person can pick a theme in the app (D-048).
 *
 * It renders nothing and does nothing on iOS, web and Windows. A failure is caught and ignored,
 * because a wrong button colour must never stop the app.
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
  return <NavigationBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
