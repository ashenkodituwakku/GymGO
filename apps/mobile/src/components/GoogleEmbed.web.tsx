/**
 * Google's own map and listing card for a gym, in the browser: an iframe of
 * Google's public embed page. Its links open in a new tab.
 *
 * Google only shows its card (name, stars, number of reviews) when the embed
 * is at least about 420 px wide. In a narrower space the iframe is laid out
 * at EMBED_WIDTH and scaled down to fit, as the phone's web view does.
 */

import { createElement, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useGoogleReach } from '@/lib/googleReach';
import { color, radius, themed } from '@/lib/theme';
import { GoogleUnavailable } from './GoogleUnavailable';

const EMBED_WIDTH = 440;

/**
 * `what` names the embed when it can't load ("Street View"); `caption`
 * shows under it only when it can, so it never describes an empty box.
 */
export function GoogleEmbed({ url, height, what = 'Google’s map', caption }: { url: string; height: number; what?: string; caption?: ReactNode }) {
  const [width, setWidth] = useState(0);
  const scale = width > 0 && width < EMBED_WIDTH ? width / EMBED_WIDTH : 1;
  const { reach, retry } = useGoogleReach();

  if (reach !== 'ok') return <GoogleUnavailable what={what} height={height} reach={reach} onRetry={retry} />;
  return (
    <>
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
    {caption}
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  frame: { borderRadius: radius.lg + 4, overflow: 'hidden', backgroundColor: color.fill },
}));
