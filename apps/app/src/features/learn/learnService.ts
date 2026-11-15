import { cleanCompleted, getLesson } from '@memory-journal/core';
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { getFirebase } from '@/lib/firebase';

const progressRef = (uid: string) => doc(getFirebase().db, 'users', uid, 'progress', 'tutorials');

/**
 * Live list of the lessons the user has finished, in the order the lessons are taught. The
 * document does not exist until the first lesson is marked, which reads as no progress. Anything
 * unexpected in it (a lesson that no longer exists, a repeat, the wrong type) is dropped.
 */
export function subscribeProgress(
  uid: string,
  onChange: (completed: string[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    progressRef(uid),
    (snapshot) => onChange(cleanCompleted(snapshot.data()?.completed)),
    onError,
  );
}

/**
 * Marks a lesson as done or not done. The write adds or removes just this lesson, so two devices
 * that mark different lessons do not overwrite each other, and a write made offline waits in
 * Firestore's queue. The screens do not wait for it. An unknown lesson id changes nothing.
 */
export function setLessonDone(uid: string, lessonId: string, done: boolean): Promise<void> {
  if (getLesson(lessonId) === undefined) return Promise.resolve();
  return setDoc(
    progressRef(uid),
    { completed: done ? arrayUnion(lessonId) : arrayRemove(lessonId) },
    { merge: true },
  );
}
