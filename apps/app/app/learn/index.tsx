import { LESSONS } from '@memory-journal/core';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LessonList } from '@/features/learn/LessonList';
import { useLearnProgress } from '@/features/learn/useLearnProgress';
import { ScreenHeader, usePalette } from '@/features/tags/ui';

export default function LearnRoute() {
  const router = useRouter();
  const palette = usePalette();
  const { completed, status } = useLearnProgress();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader
          title="Learn"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        {/* The lessons are bundled with the app, so they show at once, online or not. */}
        <LessonList
          lessons={LESSONS}
          completed={completed}
          onOpen={(lessonId) => router.push(`/learn/${lessonId}`)}
        />
        {status === 'loading' ? (
          <View style={{ padding: 8 }}>
            <ActivityIndicator accessibilityLabel="Loading your progress" />
          </View>
        ) : null}
        {status === 'error' ? (
          <Text style={{ color: palette.muted, textAlign: 'center', padding: 16 }}>
            Your progress could not be loaded. The lessons are still available.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
