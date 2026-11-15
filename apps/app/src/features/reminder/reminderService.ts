import {
  REMINDER_BODY,
  REMINDER_HOUR,
  REMINDER_MINUTE,
  REMINDER_TITLE,
  reminderAction,
  type NotificationPermission,
  type ReminderAction,
} from '@memory-journal/core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** One fixed id, so scheduling again replaces the reminder instead of adding a second one. */
export const REMINDER_ID = 'daily-reminder';
export const REMINDER_CHANNEL_ID = 'daily-reminder';

/** Marks the notification, so a tap on it is known to mean "open today's page". */
export const REMINDER_DATA = { open: 'today' } as const;

/** The reminder is mobile only. The web build is shared with the desktop app, which has its own. */
export const remindersSupported = Platform.OS === 'android' || Platform.OS === 'ios';

/** Shows the reminder as a banner even while the app is open. */
export function configureNotificationDisplay(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function readPermission(): Promise<NotificationPermission> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return String(current.status) === 'undetermined' && current.canAskAgain
    ? 'undetermined'
    : 'denied';
}

/**
 * Brings the device in line with the reminder rules in core: asks for permission the first time
 * (while it is undetermined), then schedules the repeating 21:00 local notification, or removes it
 * when the reminder is off or permission was refused. It is safe to call as often as needed, on
 * every app start and after a time zone change, because the same id is replaced each time.
 * Returns what ended up happening.
 */
export async function syncReminder(enabled: boolean): Promise<ReminderAction> {
  let permission = await readPermission();
  let action = reminderAction({ enabled, permission });

  if (action === 'ask') {
    const asked = await Notifications.requestPermissionsAsync();
    permission = asked.granted ? 'granted' : 'denied';
    action = reminderAction({ enabled, permission });
  }

  if (action !== 'schedule') {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    return action;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: REMINDER_TITLE, body: REMINDER_BODY, data: { ...REMINDER_DATA } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: REMINDER_CHANNEL_ID,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    },
  });
  return 'schedule';
}
