import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { SPACING } from '@/theme/layout';
import { chunkRows } from '@/theme/sizeClass';

interface Props {
  /** How many cards sit side by side; one keeps a plain stacked list. */
  columns: number;
  gap?: number;
  children: ReactNode;
}

/**
 * A list of cards in one, two or three equal columns. Each card keeps its own wrapper (for the
 * entrance stagger or a delete collapse), so only the rows are laid out here. The last row is
 * padded with empty cells so its cards keep the width of the others.
 */
export function ResponsiveGrid({ columns, gap = SPACING.sm, children }: Props) {
  const items = Children.toArray(children);
  if (columns <= 1) {
    return (
      <View accessibilityRole="list" style={{ gap }}>
        {items}
      </View>
    );
  }
  return (
    <View accessibilityRole="list" style={{ gap }}>
      {chunkRows(items, columns).map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap }}>
          {Array.from({ length: columns }, (_, cell) => (
            <View key={cell} style={{ flex: 1, minWidth: 0 }}>
              {row[cell] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
