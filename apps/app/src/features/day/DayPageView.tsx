import {
  markAdditions,
  ordinal,
  pageOf,
  parseTimeLine,
  storedSegments,
  type DayContent,
  type TextSegment,
} from '@memory-journal/core';
import { Clock } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

interface Props {
  /** The pass on screen, in either shape. It is read through `pageOf` (section 18.5). */
  content: DayContent;
  /** The pass just before it. When given, words that were not in it are marked. */
  previous?: DayContent | null;
  /** Revision number of `previous`, for the summary line. */
  previousN?: number | undefined;
  /** Current tag names by id, so a mention shows as `@Name`. Without it the stored name is used. */
  names?: ReadonlyMap<string, string>;
  /** Opens the tag detail screen when a tag chip is pressed. */
  onOpenTag?: (tagId: string) => void;
}

const NO_NAMES: ReadonlyMap<string, string> = new Map();
const pad = (value: number): string => String(value).padStart(2, '0');

/** Splits marked text into lines, keeping which pieces are additions. Time lines stay whole. */
function linesOf(pieces: readonly TextSegment[]): TextSegment[][] {
  const lines: TextSegment[][] = [[]];
  for (const piece of pieces) {
    piece.text
      .replace(/\r/g, '')
      .split('\n')
      .forEach((part, index) => {
        if (index > 0) lines.push([]);
        if (part !== '') lines[lines.length - 1]?.push({ text: part, added: piece.added });
      });
  }
  return lines;
}

/**
 * The read-only page of a day (section 18.2). It shows the text in the order it was written:
 * a time line becomes a small clock chip (`21:00` for an hour only, `21:25` with minutes) and a
 * tag mention becomes a tag chip that opens the tag. Legacy days show their Free Notes first,
 * then their rows in time order. With `previous`, added words are bold on a coloured background,
 * so the mark does not depend on colour alone, and time lines are never marked.
 */
export function DayPageView({
  content,
  previous = null,
  previousN,
  names = NO_NAMES,
  onOpenTag,
}: Props) {
  const { palette, scheme } = useTheme();
  const addedFill = scheme === 'dark' ? '#4a3d00' : '#fff1a8';

  const text = pageOf(content);
  const marked = previous ? markAdditions(previous, { freeNotes: text, blocks: [] }) : null;
  const pieces: TextSegment[] = marked ? marked.freeNotes : [{ text, added: false }];
  const count = marked?.addedWordCount ?? 0;

  function renderPieces(line: readonly TextSegment[]) {
    return (
      <Text variant="body" style={{ lineHeight: 24 }}>
        {line.flatMap((piece, pieceIndex) =>
          storedSegments(piece.text, names).map((segment, index) => {
            const key = `${pieceIndex}:${index}`;
            const addedStyle = piece.added
              ? { backgroundColor: addedFill, fontWeight: '700' as const }
              : null;
            if (segment.mentionId === null) {
              return (
                <Text key={key} testID={piece.added ? 'added-text' : undefined} style={addedStyle}>
                  {segment.display}
                </Text>
              );
            }
            const tagId = segment.mentionId;
            return (
              <Text
                key={key}
                testID="tag-chip"
                accessibilityRole="link"
                accessibilityLabel={`Tag ${segment.display.slice(1)}`}
                onPress={onOpenTag ? () => onOpenTag(tagId) : undefined}
                style={{
                  color: palette.accent,
                  fontWeight: '600',
                  backgroundColor: palette.surfaceRaised,
                  ...(addedStyle ?? {}),
                }}
              >
                {segment.display}
              </Text>
            );
          }),
        )}
      </Text>
    );
  }

  return (
    <View
      testID="day-page"
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.xs,
      }}
    >
      {marked !== null && previousN !== undefined ? (
        <Text
          accessibilityRole="summary"
          variant="caption"
          style={{ color: palette.muted, marginBottom: SPACING.sm }}
        >
          {count === 0
            ? `Nothing new since the ${ordinal(previousN)} pass.`
            : `${count} new ${count === 1 ? 'word' : 'words'} since the ${ordinal(previousN)} pass, shown in bold.`}
        </Text>
      ) : null}

      {linesOf(pieces).map((line, index) => {
        const joined = line.map((piece) => piece.text).join('');
        if (joined.trim() === '') {
          return <View key={index} style={{ height: SPACING.sm }} />;
        }
        const time = parseTimeLine(joined);
        if (time !== null) {
          const label = `${pad(time.hour)}:${pad(time.minute ?? 0)}`;
          return (
            <View
              key={index}
              testID="time-chip"
              accessibilityLabel={`Time ${label}`}
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING.xs,
                marginTop: SPACING.sm,
                paddingHorizontal: SPACING.sm,
                paddingVertical: SPACING.xs,
                borderRadius: RADIUS.pill,
                borderWidth: BORDER_WIDTH,
                borderColor: palette.border,
                backgroundColor: palette.surfaceRaised,
              }}
            >
              <Icon icon={Clock} size={14} color={palette.accent} />
              <Text variant="caption" style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>
                {label}
              </Text>
            </View>
          );
        }
        return <View key={index}>{renderPieces(line)}</View>;
      })}
    </View>
  );
}
