import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/authStore';
import { useTodayId } from '@/features/calendar/useTodayId';

/** The reminder helpers the Electron preload script exposes (documentation sections 5.8 and 10). */
type ReminderBridge = {
  setReminderEnabled?: (enabled: boolean) => Promise<void>;
  onOpenToday?: (callback: () => void) => () => void;
};

function getBridge(): ReminderBridge | undefined {
  return (globalThis as { memoryJournal?: ReminderBridge }).memoryJournal;
}

/**
 * The Windows (Electron) side of the daily reminder (section 5.8). The reminder itself is scheduled
 * and shown by the Electron main process, which lives on in the system tray; this hook only tells
 * it whether a reminder is wanted and opens today's page when the person taps the notification.
 * `enabled` is the Settings toggle. A guest gets the reminder like a signed-in user (section 15.6,
 * point 13); the main process is told "off" only while the app is still working out which of the
 * two it is. On phones and in a plain browser there is no bridge and this does nothing.
 */
export function useDesktopReminder(enabled = true): void {
  const router = useRouter();
  const ready = useAuthStore((s) => s.status !== 'loading');
  const todayId = useTodayId();
  const wanted = ready && enabled;

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge?.setReminderEnabled) return;
    // A refused message must not break the app; the next start or change tells the main process again.
    bridge.setReminderEnabled(wanted).catch(() => undefined);
  }, [wanted]);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge?.onOpenToday || !ready) return;
    return bridge.onOpenToday(() => router.push(`/day/${todayId}`));
  }, [ready, todayId, router]);
}
