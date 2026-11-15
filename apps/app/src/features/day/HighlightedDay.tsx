import {
  hourLabel,
  markAdditions,
  normalizeContent,
  ordinal,
  timeLabel,
  toDisplayText,
  type DayContent,
  type TextSegment,
} from '@memory-journal/core';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  /** The pass on screen. */
  current: DayContent;
  /** The pass just before it, which the additions are measured against. */
  previous: DayContent;
  /** Revision number of `previous`, for the summary line. */
  previousN: number;
  /** Current tag names by id, so a mention shows as `@Name`. Without it the stored name is used. */
  names?: ReadonlyMap<string, string>;
}

const NO_NAMES: ReadonlyMap<string, string> = new Map();

/**
 * A read-only view of one pass in which the words that were not in the previous pass are
 * marked. Added words are bold on a coloured background, so the mark does not depend on
 * colour alone. Only the parts of the day that have text are listed.
 */
export function HighlightedDay({ current, previous, previousN, names = NO_NAMES }: Props) {
  const { palette, scheme } = useTheme();
  const colors = {
    text: palette.text,
    muted: palette.muted,
    border: palette.border,
    accent: palette.accent,
    // Text on this fill is the normal text colour, which reads well on both fills.
    added: scheme === 'dark' ? '#4a3d00' : '#fff1a8',
  };

  // The same canonical form on both sides, so blocks line up with their marked segments.
  const shown = normalizeContent(current);
  const result = markAdditions(normalizeContent(previous), shown);
  const count = result.addedWordCount;

  function renderSegments(segments: TextSegment[]) {
    return (
      <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23 }}>
        {segments.map((segment, index) =>
          segment.added ? (
            <Text
              key={index}
              testID="added-text"
              style={{ backgroundColor: colors.added, fontWeight: '700' }}
            >
              {toDisplayText(segment.text, names)}
            </Text>
          ) : (
            <Text key={index}>{toDisplayText(segment.text, names)}</Text>
          ),
        )}
      </Text>
    );
  }

  return (
    <View
      style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, gap: 16 }}
    >
      <Text accessibilityRole="summary" style={{ color: colors.muted, fontSize: 13 }}>
        {count === 0
          ? `Nothing new since the ${ordinal(previousN)} pass.`
          : `${count} new ${count === 1 ? 'word' : 'words'} since the ${ordinal(previousN)} pass, shown in bold.`}
      </Text>

      {shown.freeNotes.trim() !== '' ? (
        <View style={{ gap: 6 }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}
          >
            Free notes
          </Text>
          {renderSegments(result.freeNotes)}
        </View>
      ) : null}

      {shown.blocks.map((block, index) => {
        const label =
          block.minute === null ? hourLabel(block.hour) : timeLabel(block.hour, block.minute);
        return (
          <View
            key={`${block.hour}:${block.minute ?? 'h'}`}
            style={{ gap: 4, borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 }}
          >
            <Text
              style={{
                color: block.minute === null ? colors.muted : colors.accent,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            >
              {label}
            </Text>
            {renderSegments(result.blocks[index] ?? [])}
          </View>
        );
      })}
    </View>
  );
}
