import { parseLesson, TRY_IT_HEADING, type Lesson } from '@memory-journal/core';
import { Text, View } from 'react-native';

import { ActionButton, usePalette } from '@/features/tags/ui';

interface Props {
  lesson: Lesson;
  done: boolean;
  onToggleDone: () => void;
  /** Opens today's page on the Day screen. */
  onTryIt: () => void;
}

/**
 * One lesson drawn from its bundled text, followed by the Mark as done toggle. The Try it tonight
 * section is the last section of every lesson, so its button sits at the end of the text.
 */
export function LessonView({ lesson, done, onToggleDone, onTryIt }: Props) {
  const palette = usePalette();
  const blocks = parseLesson(lesson.body);
  const tryItIndex = blocks.findIndex(
    (block) => block.type === 'heading' && block.text === TRY_IT_HEADING,
  );

  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 12 }}>
      <Text style={{ color: palette.muted, fontSize: 13 }}>{lesson.minutes} min read</Text>
      {blocks.map((block, index) => {
        const key = `${index}-${block.type}`;
        if (block.type === 'heading') {
          return (
            <Text
              key={key}
              accessibilityRole="header"
              style={{ color: palette.text, fontSize: 19, fontWeight: '700', marginTop: 8 }}
            >
              {block.text}
            </Text>
          );
        }
        if (block.type === 'list') {
          return (
            <View key={key} style={{ gap: 6 }}>
              {block.items.map((item, itemIndex) => (
                <View key={`${key}-${itemIndex}`} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>
                    {'\u2022'}
                  </Text>
                  <Text style={{ flex: 1, color: palette.text, fontSize: 16, lineHeight: 24 }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={key} style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>
            {block.text}
          </Text>
        );
      })}
      {tryItIndex !== -1 ? (
        <View style={{ alignItems: 'flex-start' }}>
          <ActionButton label="Open today's page" tone="primary" onPress={onTryIt} />
        </View>
      ) : null}
      <View
        style={{
          marginTop: 8,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          alignItems: 'flex-start',
        }}
      >
        <ActionButton
          label={done ? 'Mark as not done' : 'Mark as done'}
          tone={done ? 'plain' : 'primary'}
          onPress={onToggleDone}
        />
      </View>
    </View>
  );
}
