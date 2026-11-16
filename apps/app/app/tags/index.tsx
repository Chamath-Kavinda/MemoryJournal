import { useRouter } from 'expo-router';
import { Tag as TagGlyph } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorCard } from '@/components/ErrorCard';
import { Skeleton } from '@/components/Skeleton';
import { TagBrowser } from '@/features/tags/TagBrowser';
import { useTagErrorStore, watchWrite } from '@/features/tags/tagErrors';
import { deleteTag } from '@/features/tags/tagService';
import { ErrorBanner } from '@/features/tags/ui';
import { useMentionCounts } from '@/features/tags/useMentionCounts';
import { useTagData } from '@/features/tags/useTagData';
import { useJournalRepository } from '@/lib/journal';
import { TabHeader } from '@/navigation/TabHeader';
import { SPACING } from '@/theme/layout';
import { CONTENT_MAX_WIDTH } from '@/theme/palette';

export default function TagsRoute() {
  const router = useRouter();
  const repository = useJournalRepository();
  const { categories, tags, status } = useTagData(repository);
  const counts = useMentionCounts(repository);
  const message = useTagErrorStore((s) => s.message);
  const clearMessage = useTagErrorStore((s) => s.clear);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <TabHeader title="Tags" icon={TagGlyph} />
        {message !== null ? <ErrorBanner message={message} onDismiss={clearMessage} /> : null}
        {status === 'loading' ? (
          <View
            testID="tags-loading"
            style={{
              width: '100%',
              maxWidth: CONTENT_MAX_WIDTH,
              alignSelf: 'center',
              padding: SPACING.lg,
              gap: SPACING.sm,
            }}
          >
            <Skeleton height={44} />
            <Skeleton height={72} radius={16} />
            <Skeleton height={72} radius={16} />
            <Skeleton height={72} radius={16} />
          </View>
        ) : null}
        {status === 'error' ? (
          <View style={{ padding: SPACING.lg }}>
            <ErrorCard message="Your tags could not be loaded. Check your connection and open this screen again." />
          </View>
        ) : null}
        {status === 'ready' ? (
          <TagBrowser
            categories={categories}
            tags={tags}
            counts={counts}
            onOpenTag={(tagId) => router.push(`/tags/${tagId}`)}
            onNewTag={() => router.push('/tags/new')}
            onManageCategories={() => router.push('/tags/categories')}
            onDeleteTag={(tagId) => {
              if (repository === null) return;
              watchWrite(deleteTag(repository, tagId), 'The tag could not be deleted.');
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
