import { learnProgress, nextLesson, type Lesson } from '@memory-journal/core';
import { Pressable, View } from 'react-native';

import { Text } from '@/theme/themed';

import { usePalette } from '@/features/tags/ui';

interface Props {
  lessons: readonly Lesson[];
  completed: readonly string[];
  onOpen: (lessonId: string) => void;
}

/** The lesson list: how far along the person is, and one row per lesson in teaching order. */
export function LessonList({ lessons, completed, onOpen }: Props) {
  const palette = usePalette();
  const { done, total } = learnProgress(completed);
  const next = nextLesson(completed);

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}>
      <Text style={{ color: palette.text, fontSize: 16 }}>
        {done === total
          ? `All ${total} lessons done.`
          : `${done} of ${total} lessons done${next ? `. Up next: ${next.title}.` : '.'}`}
      </Text>
      {lessons.map((lesson) => {
        const finished = completed.includes(lesson.id);
        return (
          <Pressable
            key={lesson.id}
            accessibilityRole="button"
            accessibilityLabel={`${lesson.title}, ${lesson.minutes} minute read${finished ? ', done' : ''}`}
            onPress={() => onOpen(lesson.id)}
            style={{
              minHeight: 44,
              padding: 14,
              gap: 4,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, color: palette.text, fontSize: 17, fontWeight: '600' }}>
                {lesson.title}
              </Text>
              {finished ? (
                <Text style={{ color: palette.accent, fontSize: 14, fontWeight: '600' }}>Done</Text>
              ) : null}
            </View>
            <Text style={{ color: palette.muted, fontSize: 14 }}>{lesson.summary}</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{lesson.minutes} min read</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
