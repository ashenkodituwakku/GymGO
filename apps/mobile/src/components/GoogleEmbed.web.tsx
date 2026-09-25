/**
 * Google's own map and listing card for a gym, in the browser: an iframe of
 * Google's public embed page. Its links open in a new tab.
 *
 * Google only shows its card (name, stars, number of reviews) when the embed
 * is at least about 420 px wide. In a narrower space the iframe is laid out
 * at EMBED_WIDTH and scaled down to fit, as the phone's web view does.
 */

import { createElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, radius, themed } from '@/lib/theme';

const EMBED_WIDTH = 440;

export function GoogleEmbed({ url, height }: { url: string; height: number }) {
  const [width, setWidth] = useState(0);
  const scale = width > 0 && width < EMBED_WIDTH ? width / EMBED_WIDTH : 1;

  return (
    <View style={[styles.frame, { height }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 &&
        createElement('iframe', {
          src: url,
          title: 'Google Maps',
          loading: 'lazy',
          referrerPolicy: 'no-referrer-when-downgrade',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            border: 0,
            width: width / scale,
            height: height / scale,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          },
        })}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  frame: { borderRadius: radius.lg + 4, overflow: 'hidden', backgroundColor: color.fill },
}));
