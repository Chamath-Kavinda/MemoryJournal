import type { Tag, TagCategory } from '@memory-journal/core';
import { Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { useConfirm } from '@/components/useConfirm';
import { BORDER_WIDTH, RADIUS, SPACING } from '@/theme/layout';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/theme/themed';

import { categoryIcon } from './categoryIcon';

/** Width and height of the tinted circle that holds the category icon. */
const CIRCLE = 44;

interface Props {
  tag: Tag;
  category: TagCategory | undefined;
  /** Days and library pages that mention the tag; left out while the counts load. */
  mentions: number | undefined;
  onOpen: () => void;
  /** Called only after the person confirms in the dialog. */
  onDelete: () => void;
}

function mentionLabel(count: number): string {
  return `${count} ${count === 1 ? 'mention' : 'mentions'}`;
}

/** One tag of the Tags list: category icon, name, note preview, mention count and delete. */
export function TagCard({ tag, category, mentions, onOpen, onDelete }: Props) {
  const { palette } = useTheme();
  const confirm = useConfirm();
  const categoryName = category?.name ?? 'No category';

  const askDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete tag?',
      message: `${tag.name} will be deleted. Mentions in your old entries stay as plain text.`,
      confirmLabel: 'Delete tag',
      icon: Trash2,
    });
    if (confirmed) onDelete();
  };

  const detail = mentions === undefined ? null : mentionLabel(mentions);

  return (
    <Card padding={0}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PressableScale
          testID={`tag-card-${tag.id}`}
          accessibilityLabel={[`${tag.name}, ${categoryName}`, detail].filter(Boolean).join(', ')}
          onPress={onOpen}
          style={{ flex: 1 }}
          innerStyle={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.md,
            padding: SPACING.md,
          }}
        >
          <View
            style={{
              width: CIRCLE,
              height: CIRCLE,
              borderRadius: RADIUS.pill,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: BORDER_WIDTH,
              borderColor: palette.border,
              backgroundColor: palette.surfaceRaised,
            }}
          >
            <Icon icon={categoryIcon(category)} size="inline" color={palette.neonViolet} />
          </View>
          <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
            <Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>{tag.name}</Text>
            {tag.note ? (
              <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 14 }}>
                {tag.note}
              </Text>
            ) : null}
            <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 13 }}>
              {[categoryName, detail].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </PressableScale>
        <IconButton
          testID={`tag-delete-${tag.id}`}
          icon={Trash2}
          accessibilityLabel={`Delete ${tag.name}`}
          color={palette.danger}
          onPress={() => void askDelete()}
        />
      </View>
    </Card>
  );
}
