import type { BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';
import { color, radius } from '@/lib/theme';
import { Glass } from './Glass';

/**
 * The sheet's surface: the thick system material with the device's corner
 * radius, as system sheets have. A hairline on top stops it dissolving into
 * a pale map.
 */
export function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return (
    <View style={[style, styles.shadow]} pointerEvents="none">
      <Glass style={styles.glass} weight="thick" />
    </View>
  );
}

/** The opaque variant, for sheets stacked on sheets. */
export function SolidSheetBackground({ style }: BottomSheetBackgroundProps) {
  return <View style={[style, styles.solid]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  shadow: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowColor: color.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  glass: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.glassBorder,
    overflow: 'hidden',
  },
  solid: {
    backgroundColor: color.groupedBackground,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowColor: color.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -2 },
    elevation: 16,
  },
});
