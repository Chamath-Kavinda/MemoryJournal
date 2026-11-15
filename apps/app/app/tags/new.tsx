import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TagForm } from '@/features/tags/TagForm';
import { createTag } from '@/features/tags/tagService';
import { watchWrite } from '@/features/tags/tagErrors';
import { useTagData } from '@/features/tags/useTagData';
import { ScreenHeader } from '@/features/tags/ui';
import { useLeaveGuard } from '@/navigation/useLeaveGuard';

export default function NewTagRoute() {
  const router = useRouter();
  const { uid, categories, tags, status } = useTagData();
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/tags'));
  // The form asks for itself when its own Cancel is pressed; Back, Esc and Alt+Left ask here.
  const [dirty, setDirty] = useState(false);
  const back = useLeaveGuard({ dirty, leave, message: 'This new tag will not be saved.' });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <ScreenHeader title="New tag" onBack={back} />
        {status === 'ready' && uid !== undefined ? (
          <TagForm
            categories={categories}
            tags={tags}
            onCancel={leave}
            onDirtyChange={setDirty}
            onSubmit={(draft) => {
              // The list shows the tag at once; a refused write is reported on the Tags screen.
              watchWrite(createTag(uid, draft).saved, 'The new tag could not be saved.');
              leave();
            }}
          />
        ) : (
          <ActivityIndicator style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
