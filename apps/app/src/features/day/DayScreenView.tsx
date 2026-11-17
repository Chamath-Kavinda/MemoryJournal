import { parseDayId, type DayId, type GuestDayAccess } from '@memory-journal/core';
import { format } from 'date-fns';
import { Lock, Pencil, Save, TriangleAlert, X, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FadeUp } from '@/components/FadeUp';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { useBackShortcut } from '@/navigation/shortcuts';
import { SPACING } from '@/theme/layout';
import type { Palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { LockChip } from './LockChip';

interface Props {
  dayId: DayId;
  /** Null when the day id in the address is not a real date. */
  access: GuestDayAccess | null;
  onBack: () => void;
  /** Starts editing. Without it the screen shows no pencil (an older pass, or nothing to edit). */
  onEdit?: (() => void) | undefined;
  /** True when the pencil is shown but writing is not possible now, for example before 21:00. */
  editDisabled?: boolean;
  /** Edit mode: the header shows Cancel (X) and Save instead of Back and the pencil. */
  editing?: boolean;
  onCancel?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  saving?: boolean;
  /** False while a sheet is open, so Esc closes the sheet and does not cancel the edit. */
  cancelShortcut?: boolean;
}

interface Banner {
  title: string;
  detail?: string;
  icon: LucideIcon;
  tone: (palette: Palette) => string;
}

/**
 * A banner only explains why writing is not possible: a future day, a day that is not valid or a
 * wrong device clock. The open and locked states have none, because the lock chip already shows
 * the state and the countdown (section 16.3).
 */
function bannerFor(access: GuestDayAccess | null): Banner | null {
  if (!access) {
    return { title: 'This is not a valid day.', icon: TriangleAlert, tone: (p) => p.danger };
  }
  switch (access.state) {
    case 'future':
      return {
        title: 'This day has not arrived yet.',
        detail: 'Future days cannot be opened.',
        icon: Lock,
        tone: (p) => p.muted,
      };
    case 'clockWrong':
      return {
        title: 'Your device clock looks wrong.',
        detail: 'Fix it to write today.',
        icon: TriangleAlert,
        tone: (p) => p.warning,
      };
    case 'locked':
    case 'open':
      return null;
  }
}

/** The X of edit mode. On the web build and in the Windows app Esc does the same. */
function CancelButton({ onCancel, shortcut }: { onCancel: () => void; shortcut: boolean }) {
  useBackShortcut(shortcut ? onCancel : noop);
  return (
    <IconButton testID="cancel-edit" icon={X} accessibilityLabel="Cancel" onPress={onCancel} />
  );
}

function noop(): void {
  // Nothing to do: the shortcut is switched off while a sheet is open.
}

/**
 * Header of the Day screen. In View mode: the Back icon, a lock chip with the countdown, a Pencil
 * that starts editing, the date and, only when writing is not possible for a reason the chip
 * does not give, a status banner with an icon. In edit mode (section 18.2): a Cancel X and a
 * gradient Save button. It fades up when the screen opens. The page sits below it.
 */
export function DayScreenView({
  dayId,
  access,
  onBack,
  onEdit,
  editDisabled = false,
  editing = false,
  onCancel,
  onSave,
  saving = false,
  cancelShortcut = true,
}: Props) {
  const { palette } = useTheme();
  const parts = parseDayId(dayId);
  const heading = parts
    ? format(new Date(parts.year, parts.month - 1, parts.day), 'EEEE, d MMMM yyyy')
    : dayId;
  const banner = bannerFor(access);
  const tone = banner ? banner.tone(palette) : null;

  return (
    <FadeUp
      style={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        padding: SPACING.lg,
        gap: SPACING.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {editing && onCancel ? (
          <CancelButton onCancel={onCancel} shortcut={cancelShortcut} />
        ) : (
          <BackButton onBack={onBack} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <LockChip access={access} />
          {editing && onSave ? (
            <Button testID="save-day" label="Save" icon={Save} loading={saving} onPress={onSave} />
          ) : onEdit ? (
            <IconButton
              testID="edit-day"
              icon={Pencil}
              accessibilityLabel="Edit day"
              onPress={onEdit}
              disabled={editDisabled}
            />
          ) : null}
        </View>
      </View>

      <Text accessibilityRole="header" variant="title">
        {heading}
      </Text>

      {banner !== null && tone !== null ? (
        <View accessibilityRole="summary">
          <Card style={{ borderColor: tone }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              <Icon icon={banner.icon} size="control" color={tone} />
              <View style={{ flex: 1, flexShrink: 1, gap: SPACING.xs }}>
                <Text variant="heading">{banner.title}</Text>
                {banner.detail ? (
                  <Text variant="body" style={{ color: palette.muted }}>
                    {banner.detail}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        </View>
      ) : null}
    </FadeUp>
  );
}
