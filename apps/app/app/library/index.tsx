import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LibraryBrowser } from '@/features/library/LibraryBrowser';
import { createLibraryItem } from '@/features/library/libraryService';
import { useLibrary } from '@/features/library/useLibrary';
import { useTagErrorStore, watchWrite } from '@/features/tags/tagErrors';
import { ErrorBanner } from '@/features/tags/ui';
import { useJournalRepository } from '@/lib/journal';
import { TabHeader } from '@/navigation/TabHeader';
import { useTabScreenEdges } from '@/navigation/useTabScreenEdges';

export default function LibraryRoute() {
  const router = useRouter();
  const repository = useJournalRepository();
  const edges = useTabScreenEdges();
  const { items, status } = useLibrary(repository);
  const error = useTagErrorStore((s) => s.message);
  const clearError = useTagErrorStore((s) => s.clear);

  return (
    <SafeAreaView edges={edges} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <TabHeader title="Library" />
        {error !== null ? <ErrorBanner message={error} onDismiss={clearError} /> : null}
        <LibraryBrowser
          items={items}
          status={repository === null ? 'loading' : status}
          onOpen={(itemId) => router.push(`/library/${itemId}`)}
          onCreate={(draft) => {
            if (repository === null) return;
            // The item opens at once; a refused write is reported in the banner above.
            const { id, saved } = createLibraryItem(repository, draft);
            watchWrite(saved, 'The new item could not be saved.');
            router.push(`/library/${id}`);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
