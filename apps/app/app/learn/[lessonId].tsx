import { getLesson } from '@memory-journal/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { Text } from '@/theme/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodayId } from '@/features/calendar/useTodayId';
import { LessonView } from '@/features/learn/LessonView';
import { useLearnProgress } from '@/features/learn/useLearnProgress';
import { ErrorBanner, ScreenHeader } from '@/features/tags/ui';

export default function LessonRoute() {
  const { lessonId: rawLessonId } = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Array.isArray(rawLessonId) ? (rawLessonId[0] ?? '') : (rawLessonId ?? '');
  const router = useRouter();
  const todayId = useTodayId();
  const { completed, failed, setDone, dismissError } = useLearnProgress();
  const lesson = getLesson(lessonId);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/learn'));

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader title={lesson?.title ?? 'Lesson'} onBack={leave} />
        {failed ? (
          <ErrorBanner message="Your progress could not be saved." onDismiss={dismissError} />
        ) : null}
        {lesson === undefined ? (
          <Text style={{ padding: 16, textAlign: 'center' }}>This lesson does not exist.</Text>
        ) : (
          <LessonView
            lesson={lesson}
            done={completed.includes(lesson.id)}
            onToggleDone={() => setDone(lesson.id, !completed.includes(lesson.id))}
            onTryIt={() => router.push(`/day/${todayId}`)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
