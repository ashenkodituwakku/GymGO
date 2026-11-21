/**
 * A demo gym's illustration where its picture goes, badged so it's never
 * taken for a photograph: a small palette in the corner of a thumbnail or a
 * card's window, or the word "Illustration" on a bigger picture.
 */

import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DemoPicture } from '@/lib/gymPicture';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

export function Illustration({ picture, style, worded = false }: { picture: DemoPicture; style: StyleProp<ViewStyle>; worded?: boolean }) {
  return (
    <View style={[style, styles.clip]}>
      {/* Sized in full: a browser otherwise draws a bundled picture at its own size. */}
      <Image source={picture.source} style={styles.fill} resizeMode="cover" accessibilityLabel={picture.alt} />
      {worded ? (
        <View style={styles.word}>
          <Txt variant="caption" color={color.onBrand} style={face('semibold')}>
            Illustration
          </Txt>
        </View>
      ) : (
        <View style={styles.badge}>
          <Icon name="palette" size={10} color={color.onBrand} />
        </View>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.scrim,
  },
  word: {
    position: 'absolute',
    left: space[2],
    bottom: space[2],
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.scrim,
  },
}));
