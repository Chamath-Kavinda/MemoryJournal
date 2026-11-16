import { nextCategoryOrder } from '@memory-journal/core';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryManager } from '@/features/tags/CategoryManager';
import { createCategory, deleteCategory, renameCategory } from '@/features/tags/tagService';
import { useTagErrorStore, watchWrite } from '@/features/tags/tagErrors';
import { useTagData } from '@/features/tags/useTagData';
import { ErrorBanner, ScreenHeader } from '@/features/tags/ui';
import { useJournalRepository } from '@/lib/journal';

export default function CategoriesRoute() {
  const router = useRouter();
  const repository = useJournalRepository();
  const { categories, tags, status } = useTagData(repository);
  const message = useTagErrorStore((s) => s.message);
  const clearMessage = useTagErrorStore((s) => s.clear);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Categories"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/tags'))}
        />
        {message !== null ? <ErrorBanner message={message} onDismiss={clearMessage} /> : null}
        {status === 'ready' && repository !== null ? (
          <CategoryManager
            categories={categories}
            tags={tags}
            onCreate={(name) =>
              watchWrite(
                createCategory(repository, name, nextCategoryOrder(categories)),
                'The category could not be saved.',
              )
            }
            onRename={(id, name) =>
              watchWrite(renameCategory(repository, id, name), 'The category could not be renamed.')
            }
            onDelete={(id) =>
              watchWrite(deleteCategory(repository, id), 'The category could not be deleted.')
            }
          />
        ) : (
          <ActivityIndicator style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
