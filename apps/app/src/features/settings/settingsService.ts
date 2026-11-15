import { readSettings, type ThemePreference, type UserSettings } from '@memory-journal/core';
import { doc, onSnapshot, updateDoc, type Unsubscribe } from 'firebase/firestore';

import { getFirebase } from '@/lib/firebase';

const userRef = (uid: string) => doc(getFirebase().db, 'users', uid);

/**
 * Live settings of the signed-in user (section 6: `users/{uid}.settings`). Missing or invalid
 * values read as the defaults, so a user document that does not exist yet reads as reminder on
 * and theme following the system.
 */
export function subscribeSettings(
  uid: string,
  onChange: (settings: UserSettings) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snapshot) => onChange(readSettings(snapshot.data()?.settings)),
    onError,
  );
}

/**
 * Each setter changes just one field, so two devices that change different settings do not
 * overwrite each other, and a change made offline waits in Firestore's queue. The user document
 * is created at sign-in; if it is missing the write is refused and the caller can tell the user.
 */
export function setReminderEnabled(uid: string, enabled: boolean): Promise<void> {
  return updateDoc(userRef(uid), { 'settings.reminderEnabled': enabled });
}

export function setTheme(uid: string, theme: ThemePreference): Promise<void> {
  return updateDoc(userRef(uid), { 'settings.theme': theme });
}
