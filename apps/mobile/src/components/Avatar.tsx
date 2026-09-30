/**
 * You, as a circle: your profile picture if you've set one, else your
 * initial on the accent colour (Rainbow's or Camo's paint where that's the
 * accent). The picture is your own, from your photos; nothing stands in for
 * it but the initial.
 */

import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { photoUrl, type Account } from '@/lib/api';
import { color, face, radius, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';
import { Txt } from './ui';

type Variant = 'largeTitle' | 'title' | 'headline' | 'subhead';

export function Avatar({ account, size, variant }: { account: Pick<Account, 'displayName' | 'avatarUrl'>; size: number; variant: Variant }) {
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
  }),
);
