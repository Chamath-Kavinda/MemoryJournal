import { REMINDER_BODY, REMINDER_TITLE } from '@memory-journal/core';
import { Notification, ipcMain, powerMonitor } from 'electron';

import { createReminderScheduler } from './reminderScheduler';

// Windows can drop a notification object that nothing refers to before the person clicks it.
const showing = new Set<Notification>();

function showReminder(onClick: () => void): void {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title: REMINDER_TITLE, body: REMINDER_BODY });
  const release = (): void => {
    showing.delete(notification);
  };
  showing.add(notification);
  notification.on('click', () => {
    release();
    onClick();
  });
  notification.on('close', release);
  notification.on('failed', release);
  notification.show();
}

/**
 * Starts the daily 21:00 reminder (section 5.8). The window tells this process through the preload
 * bridge whether a reminder is wanted (signed in, Settings toggle on); until it does, nothing is
 * shown. `onClick` runs when the person clicks the notification. Call once the app is ready.
 */
export function setupDesktopReminder(onClick: () => void): void {
  const scheduler = createReminderScheduler({
    now: () => Date.now(),
    // Read each time, so a new time zone or a daylight saving change is followed.
    utcOffsetMinutes: () => -new Date().getTimezoneOffset(),
    notify: () => showReminder(onClick),
  });

  ipcMain.handle('reminder:set-enabled', (_event, enabled: unknown) => {
    scheduler.setEnabled(enabled === true);
  });

  scheduler.start();
  // Timers do not run while the computer sleeps; look at the clock as soon as it wakes.
  powerMonitor.on('resume', () => scheduler.check());
}
