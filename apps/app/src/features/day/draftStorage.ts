import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from './draftStore';

/** Drafts live in the device's own storage, never in Firestore (section 5.3). */
export const draftStorage: KeyValueStorage = AsyncStorage;
