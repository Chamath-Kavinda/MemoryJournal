import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth/authStore';
import { LibraryBrowser } from '@/features/library/LibraryBrowser';
import { createLibraryItem } from '@/features/library/libraryService';
import { useLibrary } from '@/features/library/useLibrary';
import { useTagErrorStore, watchWrite } from '@/features/tags/tagErrors';
import { ErrorBanner, ScreenHeader } from '@/features/tags/ui';

export default function LibraryRoute() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.uid);
  const { items, status } = useLibrary(uid);
  const error = useTagErrorStore((s) => s.message);
  const clearError = useTagErrorStore((s) => s.clear);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <ScreenHeader
          title="Library"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        {error !== null ? <ErrorBanner message={error} onDismiss={clearError} /> : null}
        <LibraryBrowser
          items={items}
          status={uid === undefined ? 'loading' : status}
          onOpen={(itemId) => router.push(`/library/${itemId}`)}
          onCreate={(draft) => {
            if (uid === undefined) return;
            // The item opens at once; a refused write is reported in the banner above.
            const { id, saved } = createLibraryItem(uid, draft);
            watchWrite(saved, 'The new item could not be saved.');
            router.push(`/library/${id}`);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
