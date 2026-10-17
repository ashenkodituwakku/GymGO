/**
 * You, as a circle: your profile picture if you've set one, else your
 * initial on the accent colour (Rainbow's or Camo's paint where that's the
 * accent). The picture is your own, from your photos; nothing stands in for
 * it but the initial.
 */

import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { photoUrl, type Account } from '@/lib/api';
import { color, currentPaint, face, radius, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';
import { Txt } from './ui';

type Variant = 'largeTitle' | 'title' | 'headline' | 'subhead';

export function Avatar({
  account,
  size,
  variant,
  ring,
}: {
  account: Pick<Account, 'displayName' | 'avatarUrl'>;
  size: number;
  variant: Variant;
  /**
   * GymGO Pro's ring, in your accent (or Rainbow's or Camo's paint): pass the
   * colour behind the circle, for the gap between ring and picture (with a
   * plain accent the gap is clear, and this only turns the ring on).
   */
  ring?: string;
}) {
  if (ring) {
    const outer = size + 10;
    // A plain accent: the ring is an outline, its gap really clear, so a
    // card's glow shows through it (a gap painted the card's colour showed
    // as a paler or darker circle on a see-through card).
    if (!currentPaint()) {
      return (
        <View style={[styles.outline, { width: outer, height: outer, borderRadius: Math.min(outer / 2, radius.pill) }]}>
          <Avatar account={account} size={size} variant={variant} />
        </View>
      );
    }
    // Rainbow's and Camo's paint can't be an outline: the gap takes the colour behind.
    return (
      <View style={[styles.ring, { width: outer, height: outer, borderRadius: Math.min(outer / 2, radius.pill) }]}>
        <BrandFill />
        <View style={[styles.gap, { width: size + 4, height: size + 4, borderRadius: Math.min((size + 4) / 2, radius.pill), backgroundColor: ring }]}>
          <Avatar account={account} size={size} variant={variant} />
        </View>
      </View>
    );
  }
  return <Face account={account} size={size} variant={variant} />;
}

function Face({ account, size, variant }: { account: Pick<Account, 'displayName' | 'avatarUrl'>; size: number; variant: Variant }) {
  const uri = account.avatarUrl ? photoUrl(account.avatarUrl) : null;
  // A picture that won't load (the server's away) shows the initial instead.
  const [broken, setBroken] = useState<string | null>(null);
  // Round, or as round as the look allows (8-bit's corners are square).
  const shape = { width: size, height: size, borderRadius: Math.min(size / 2, radius.pill) };
  if (uri && broken !== uri) {
    return <Image source={{ uri }} style={[styles.picture, shape]} onError={() => setBroken(uri)} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[styles.initial, shape]}>
      <BrandFill />
      <Txt variant={variant} color={color.onBrand} style={variant === 'subhead' ? face('semibold') : undefined}>
        {account.displayName.slice(0, 1).toUpperCase()}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    picture: { backgroundColor: color.fill },
    initial: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: color.brandFill },
    ring: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: color.brand },
    // 3 points of accent, then 2 of clear gap, round the picture.
    outline: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color.brand },
    gap: { alignItems: 'center', justifyContent: 'center' },
  }),
);
