import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/authStore';
import { useTodayId } from '@/features/calendar/useTodayId';
import { deviceZone } from '@/features/profile/profileService';

import {
  REMINDER_DATA,
  configureNotificationDisplay,
  remindersSupported,
  syncReminder,
} from './reminderService';

if (remindersSupported) configureNotificationDisplay();

// The hook throws on web, where the shared build also runs inside the desktop app. Which one is used
// is fixed for the whole run, so every render calls the same hook.
const useLastResponse: () => Notifications.NotificationResponse | null | undefined =
  remindersSupported ? Notifications.useLastNotificationResponse : () => null;

const currentOffset = () => deviceZone(Date.now()).utcOffsetMinutes;

/**
 * Keeps the daily 21:00 reminder in step with the device (section 5.8). For a guest and for a
 * signed-in user alike (section 15.6, point 13), once the app knows which of the two it is, it asks
 * for permission if that has not been decided yet and schedules the reminder. It does so again
 * whenever the device's offset from UTC changes (a new time zone or a daylight saving change),
 * noticed when the app comes back to the foreground. A tap on the notification opens today's page.
 * `enabled` is the Settings toggle.
 */
export function useReminder(enabled = true): void {
  const router = useRouter();
  const ready = useAuthStore((s) => s.status !== 'loading');
  const todayId = useTodayId();
  const [offset, setOffset] = useState(currentOffset);

  useEffect(() => {
    if (!remindersSupported) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setOffset(currentOffset());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!remindersSupported || !ready) return;
    // A refused permission or a failed schedule must not break the app; the next start tries again.
    syncReminder(enabled).catch(() => undefined);
  }, [ready, enabled, offset]);

  const response = useLastResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!remindersSupported || !ready || !response) return;
    const request = response.notification.request;
    if (request.content.data?.open !== REMINDER_DATA.open) return;
    // The same tap is reported again on a rerender; open the page once per tap.
    const tap = `${request.identifier}@${response.notification.date}`;
    if (handled.current === tap) return;
    handled.current = tap;
    router.push(`/day/${todayId}`);
  }, [response, ready, todayId, router]);
}
