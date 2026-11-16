import { Redirect } from 'expo-router';

/**
 * The app always opens on Home, signed in or not (section 15.6). Signing in is offered from
 * Home and Settings; it is never required to start.
 */
export default function Index() {
  return <Redirect href="/home" />;
}
