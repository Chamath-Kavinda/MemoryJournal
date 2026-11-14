import { serverOffsetMs } from '@memory-journal/core';
import {
  doc,
  getDocFromServer,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';

import { getFirebase } from '@/lib/firebase';

/**
 * Measures how far the device clock is from Firestore server time, in milliseconds.
 * It stamps the user document with the server's time, reads it back from the server and
 * compares it with the device clock around the request. Returns null when offline.
 */
export async function measureServerOffset(uid: string): Promise<number | null> {
  const ref = doc(getFirebase().db, 'users', uid);
  try {
    const sentAt = Date.now();
    await updateDoc(ref, { clockProbeAt: serverTimestamp() });
    const snapshot = await getDocFromServer(ref);
    const receivedAt = Date.now();
    const stamped = snapshot.get('clockProbeAt') as Timestamp | undefined;
    if (!stamped) return null;
    return serverOffsetMs(stamped.toMillis(), sentAt, receivedAt);
  } catch {
    return null;
  }
}
