import * as SplashScreen from 'expo-splash-screen';

/**
 * The native splash (a solid #07070D screen with no image) stays up until the first React screen
 * is on screen, so the hand-off to the brand splash has no flash (section 16.3). Both calls are
 * safe to repeat and never throw: on the web, in tests or if the native side is missing, they do
 * nothing.
 */
export function keepNativeSplash(): void {
  try {
    void SplashScreen.preventAutoHideAsync().catch(() => {});
  } catch {
    // Nothing to keep.
  }
}

export function hideNativeSplash(): void {
  try {
    void SplashScreen.hideAsync().catch(() => {});
  } catch {
    // Nothing to hide.
  }
}
