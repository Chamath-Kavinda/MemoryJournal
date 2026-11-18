import { Clock, Tag as TagIcon } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';

import { AddTagSheet } from './AddTagSheet';
import { AddTimeSheet } from './AddTimeSheet';
import { MentionInput, type MentionInputHandle } from './MentionInput';
import type { Tagging } from './tagging';

type SheetKind = 'time' | 'tag';

/** Shared by the writing field, the toolbar and the sheets of edit mode. */
export interface DayPageTools {
  handle: React.RefObject<MentionInputHandle | null>;
  sheet: SheetKind | null;
  /** The device time the Add time sheet starts from. */
  now: Date;
  /** The text selected when Add tag was pressed. */
  selected: string;
  openTime: () => void;
  openTag: () => void;
  close: () => void;
}

/** The state that ties the Clock and Tag buttons to the field. Call it once in the Day screen. */
export function useDayPageTools(): DayPageTools {
  const handle = useRef<MentionInputHandle | null>(null);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState('');

  // The field keeps its last cursor and selection as state, so a tap on a toolbar button that
  // takes focus away does not lose them (section 8.3). Add tag also reads the selected text now.
  const openTime = useCallback(() => {
    setNow(new Date());
    setSheet('time');
  }, []);
  const openTag = useCallback(() => {
    setSelected(handle.current?.selectedText() ?? '');
    setSheet('tag');
  }, []);
  const close = useCallback(() => setSheet(null), []);

  return { handle, sheet, now, selected, openTime, openTag, close };
}

interface EditorProps {
  /** The page as stored, with mentions as `{{tag:ID|Name}}` tokens. */
  text: string;
  onChange: (text: string) => void;
  editable: boolean;
  tagging?: Tagging | undefined;
  tools: DayPageTools;
}

/**
 * The one large writing field of edit mode (section 18.2): no Free Notes block and no hourly
 * rows. It fills the room under the toolbar, down to the bottom inset or the keyboard, and grows
 * with the text.
 */
export function DayPageEditor({ text, onChange, editable, tagging, tools }: EditorProps) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: SPACING.lg,
      }}
    >
      <MentionInput
        label="Day page"
        handle={tools.handle}
        inlineTools={false}
        fill
        autoFocus={editable}
        editable={editable}
        tagging={tagging}
        value={text}
        onChangeValue={onChange}
        style={{
          flexGrow: 1,
          color: palette.text,
          backgroundColor: palette.surfaceRaised,
          borderColor: palette.border,
          borderWidth: BORDER_WIDTH,
          borderRadius: RADIUS.input,
          padding: SPACING.md,
          minHeight: 240,
          fontSize: 16,
          lineHeight: 24,
          textAlignVertical: 'top',
        }}
      />
    </View>
  );
}

interface ToolbarProps {
  tools: DayPageTools;
  /** Without tags loaded there is nothing to add yet. */
  canTag: boolean;
}

/**
 * Clock and Tag buttons in a row under the date, above the writing field (section 8.1 of
 * v0.2.5). The Day screen pins this row, so it stays in place while the page scrolls. It has the
 * page background so text scrolling under it is hidden, and no bar or border of its own.
 */
export function DayPageToolbar({ tools, canTag }: ToolbarProps) {
  const { palette } = useTheme();
  return (
    <View testID="day-toolbar" style={{ backgroundColor: palette.background }}>
      <View
        style={{
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.xs,
        }}
      >
        <IconButton
          testID="add-time"
          icon={Clock}
          accessibilityLabel="Add time"
          color={palette.accent}
          onPress={tools.openTime}
        />
        <IconButton
          testID="add-tag"
          icon={TagIcon}
          accessibilityLabel="Add tag"
          color={palette.accent}
          disabled={!canTag}
          onPress={tools.openTag}
        />
      </View>
    </View>
  );
}

interface SheetsProps {
  tools: DayPageTools;
  tagging?: Tagging | undefined;
}

/**
 * The Add time and Add tag sheets. Choosing something inserts it at the saved cursor and closes.
 * Cancel, the close icon and hardware Back give the writing field its focus and cursor back.
 */
export function DayPageSheets({ tools, tagging }: SheetsProps) {
  const { handle, close } = tools;
  // The sheet is a Modal, so the field can only take focus once the Modal has gone.
  const closeAndRefocus = () => {
    close();
    setTimeout(() => handle.current?.focus(), 0);
  };
  if (tools.sheet === 'time') {
    return (
      <AddTimeSheet
        now={tools.now}
        onClose={closeAndRefocus}
        onInsert={(hour, minute) => {
          close();
          handle.current?.insertTime(hour, minute);
        }}
      />
    );
  }
  if (tools.sheet === 'tag' && tagging !== undefined) {
    return (
      <AddTagSheet
        tagging={tagging}
        selectedText={tools.selected}
        onClose={closeAndRefocus}
        onChoose={(id, name, replaceSelection) => {
          close();
          handle.current?.insertTag(id, name, replaceSelection);
        }}
      />
    );
  }
  return null;
}
