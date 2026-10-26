/**
 * Blocks side by side in the wide layout (lib/layout.tsx), one above the
 * other everywhere else. Each child is a column; a column that's empty
 * (null or false) is left out, and the others share its room. On a phone
 * the children are laid out exactly as if there were no Columns at all, so
 * pass each column as a fragment to keep a phone's spacing.
 */

import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useWide } from '@/lib/layout';
import { space } from '@/lib/theme';

/** The room between columns, unless said. */
export const COLUMN_GAP = space[5];

export function Columns({
  children,
  gap = COLUMN_GAP,
  inner = space[3],
  flex,
  on = true,
}: {
  children: ReactNode;
  /** False keeps them one above the other even when wide (a card in a narrow panel). */
  on?: boolean;
  /** Room between the columns. */
  gap?: number;
  /** Room between the blocks inside a column, as the page has between them. */
  inner?: number;
  /** How wide each column is next to the others (equal unless said). */
  flex?: number[];
}) {
  const wide = useWide();
  const columns = Children.toArray(children).filter((child) => isValidElement(child));
  if (!wide || !on) return <>{children}</>;
  return (
    <View style={[styles.row, { gap }]}>
      {columns.map((column, index) => (
        <View key={isValidElement(column) && column.key !== null ? column.key : index} style={[styles.column, { flex: flex?.[index] ?? 1, gap: inner }]}>
          {isValidElement(column) && column.type === Fragment ? (column.props as { children?: ReactNode }).children : column}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  cell: { width: '50%' },
});

/**
 * Cards two to a row in the wide layout; elsewhere just the cards, spaced as
 * the page spaces them.
 */
export function Grid({ children, on = true, gap = space[3] }: { children: ReactNode; on?: boolean; gap?: number }) {
  const wide = useWide();
  if (!wide || !on) return <>{children}</>;
  return (
    // Half the gap each side of a card, and the row reaching out by as much, so the outer edges line up with the page.
    <View style={[styles.grid, { rowGap: gap, marginHorizontal: -gap / 2 }]}>
      {Children.toArray(children).map((child, index) => (
        <View key={isValidElement(child) && child.key !== null ? child.key : index} style={[styles.cell, { paddingHorizontal: gap / 2 }]}>
          {child}
        </View>
      ))}
    </View>
  );
}
