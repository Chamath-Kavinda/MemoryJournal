import AsyncStorage from '@react-native-async-storage/async-storage';

import { draftKey, type KeyValueStorage } from './draftStore';

/** Drafts live in the device's own storage, never in Firestore (section 5.3). */
export const draftStorage: KeyValueStorage = AsyncStorage;

/** Removes every unsaved draft this device holds for one user. Used when the account is deleted. */
export async function clearUserDrafts(uid: string): Promise<void> {
  const prefix = draftKey(uid, '');
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((key) => key.startsWith(prefix));
  if (mine.length > 0) await AsyncStorage.removeMany(mine);
}
