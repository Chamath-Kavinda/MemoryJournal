import { cleanCompleted, getLesson, type JournalRepository } from '@memory-journal/core';

import { watchJournal } from '@/lib/watchJournal';

/**
 * Live list of the lessons the user has finished, in the order the lessons are taught, for a guest
 * on this device or a signed-in account. No progress yet reads as an empty list. Anything
 * unexpected in the stored progress (a lesson that no longer exists, a repeat, the wrong type) is
 * dropped.
 */
export function subscribeProgress(
  repository: JournalRepository,
  onChange: (completed: string[]) => void,
  onError: (error: Error) => void,
): () => void {
  return watchJournal(
    repository,
    async () => cleanCompleted((await repository.getTutorialProgress()).completed),
    onChange,
    onError,
  );
}

/**
 * Marks a lesson as done or not done. It reads the finished lessons, changes just this one and
 * writes the list back, so the other lessons stay as they were. Screens do not wait for the
 * result. An unknown lesson id changes nothing.
 */
export async function setLessonDone(
  repository: JournalRepository,
  lessonId: string,
  done: boolean,
): Promise<void> {
  if (getLesson(lessonId) === undefined) return;
  const current = cleanCompleted((await repository.getTutorialProgress()).completed);
  const without = current.filter((id) => id !== lessonId);
  const completed = cleanCompleted(done ? [...without, lessonId] : without);
  await repository.putTutorialProgress({ completed });
}
