import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';

import { Text } from '@/theme/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMentionedLibraryItems } from '@/features/library/useLibrary';
import { LibraryMentions } from '@/features/tags/LibraryMentions';
import { MentionHistory } from '@/features/tags/MentionHistory';
import { TagForm } from '@/features/tags/TagForm';
import { deleteTag, updateTag } from '@/features/tags/tagService';
import { watchWrite } from '@/features/tags/tagErrors';
import { useMentionedDays } from '@/features/tags/useMentionedDays';
import { useTagData } from '@/features/tags/useTagData';
import { ScreenHeader } from '@/features/tags/ui';
import { useLeaveGuard } from '@/navigation/useLeaveGuard';

export default function TagRoute() {
  const { tagId: rawTagId } = useLocalSearchParams<{ tagId: string }>();
  const tagId = Array.isArray(rawTagId) ? (rawTagId[0] ?? '') : (rawTagId ?? '');
  const router = useRouter();
  const { uid, categories, tags, status } = useTagData();
  const { days: mentionedDays, status: mentionStatus } = useMentionedDays(uid, tagId);
  const { items: mentionedItems, status: libraryStatus } = useMentionedLibraryItems(uid, tagId);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/tags'));
  const tag = tags.find((t) => t.id === tagId);
  // The form asks for itself when its own Cancel is pressed; Back, Esc and Alt+Left ask here.
  const [dirty, setDirty] = useState(false);
  const back = useLeaveGuard({
    dirty,
    leave,
    message: `Your changes to ${tag?.name ?? 'this tag'} will not be saved.`,
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <ScreenHeader title={tag?.name ?? 'Tag'} onBack={back} />
        {status === 'loading' || uid === undefined ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : tag === undefined ? (
          <Text style={{ padding: 16, textAlign: 'center' }}>This tag no longer exists.</Text>
        ) : (
          <>
            <MentionHistory
              days={mentionedDays}
              status={mentionStatus}
              onOpenDay={(dayId) => router.push(`/day/${dayId}`)}
            />
            <LibraryMentions
              items={mentionedItems}
              status={libraryStatus}
              onOpenItem={(itemId) => router.push(`/library/${itemId}`)}
            />
            <TagForm
              // A new key resets the form if the tag is replaced while the screen is open.
              key={tag.id}
              categories={categories}
              tags={tags}
              initial={tag}
              onCancel={leave}
              onDirtyChange={setDirty}
              onSubmit={(draft) => {
                watchWrite(updateTag(uid, tag.id, draft), 'The tag changes could not be saved.');
                leave();
              }}
              onDelete={() => {
                watchWrite(deleteTag(uid, tag.id), 'The tag could not be deleted.');
                leave();
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
