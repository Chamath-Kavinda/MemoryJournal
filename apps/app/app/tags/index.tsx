import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView } from 'react-native';

import { Text } from '@/theme/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TagBrowser } from '@/features/tags/TagBrowser';
import { useTagErrorStore } from '@/features/tags/tagErrors';
import { useTagData } from '@/features/tags/useTagData';
import { ErrorBanner, ScreenHeader } from '@/features/tags/ui';

export default function TagsRoute() {
  const router = useRouter();
  const { categories, tags, status } = useTagData();
  const message = useTagErrorStore((s) => s.message);
  const clearMessage = useTagErrorStore((s) => s.clear);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Tags"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        {message !== null ? <ErrorBanner message={message} onDismiss={clearMessage} /> : null}
        {status === 'loading' ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
        {status === 'error' ? (
          <Text accessibilityRole="alert" style={{ padding: 16, textAlign: 'center' }}>
            Your tags could not be loaded. Check your connection and open this screen again.
          </Text>
        ) : null}
        {status === 'ready' ? (
          <TagBrowser
            categories={categories}
            tags={tags}
            onOpenTag={(tagId) => router.push(`/tags/${tagId}`)}
            onNewTag={() => router.push('/tags/new')}
            onManageCategories={() => router.push('/tags/categories')}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
