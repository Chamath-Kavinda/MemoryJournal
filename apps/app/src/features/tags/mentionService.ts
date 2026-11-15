import { mentionedDays, type MentionedDay } from '@memory-journal/core';
import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { z } from 'zod';

import { getFirebase } from '@/lib/firebase';

// Only the metadata the list needs; journal text is never read for this screen.
const dayMentionsSchema = z.object({
  date: z.string(),
  wordCount: z.number(),
  mentions: z.array(z.string()),
});

/**
 * Listens to the days whose latest pass mentions a tag, newest first. The day documents
 * carry the tag ids (D-024), so one query is enough and no revision is read. Works offline:
 * Firestore serves the local cache and the callback fires again on sync. Documents with an
 * unexpected shape are left out.
 */
export function subscribeMentionedDays(
  uid: string,
  tagId: string,
  onChange: (days: MentionedDay[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const days = query(
    collection(getFirebase().db, 'users', uid, 'days'),
    where('mentions', 'array-contains', tagId),
  );

  return onSnapshot(
    days,
    (snapshot) => {
      const metas = snapshot.docs.flatMap((document) => {
        const parsed = dayMentionsSchema.safeParse(document.data());
        return parsed.success ? [parsed.data] : [];
      });
      onChange(mentionedDays(metas, tagId));
    },
    onError,
  );
}
