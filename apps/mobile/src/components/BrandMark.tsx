/**
 * GymGO's own mark: a G made from a weight plate, its crossbar an arrow on
 * its way out. The shapes come from scripts/brand-mark.mjs, which draws the
 * app icon from the same numbers.
 *
 * `BrandMark` is the bare mark in one colour, `AppBadge` the app icon itself,
 * and `Wordmark` the mark with "GymGO". All are decoration: the text beside
 * them says what the screen is, and the wordmark reads as "GymGO".
 */

import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ICON_SKY, MARK, WORDMARK } from './brandPaths';
import { color, currentTheme } from '@/lib/theme';

/** The logo's indigo, whatever colour theme the app is in: a logo doesn't change. */
export function logoIndigo(): string {
  return currentTheme().scheme === 'dark' ? '#7D7AFF' : '#5856D6';
}

function Shapes({ fill }: { fill: string }) {
  return (
    <>
      <Path d={MARK.plate} fill="none" stroke={fill} strokeWidth={MARK.plateWidth} strokeLinecap="round" />
      <Path d={MARK.arrow} fill={fill} stroke={fill} strokeWidth={MARK.arrowRounding} strokeLinejoin="round" />
    </>
  );
}

const hidden = { 'aria-hidden': true, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** The mark alone, `size` points tall. */
export function BrandMark({ size, fill = logoIndigo() }: { size: number; fill?: string }) {
  const { box } = MARK;
  return (
    <View {...hidden}>
      <Svg width={(size * box.width) / box.height} height={size} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}>
        <Shapes fill={fill} />
      </Svg>
    </View>
  );
}

/** The app icon, `size` points square, with the corners iOS gives it. */
export function AppBadge({ size }: { size: number }) {
  // The icon's scale about the middle of its 1024 square.
  const inset = 512 * (1 - MARK.iconScale);
  // Each badge's own gradient id. In a browser ids are shared by the whole
  // page, and the Profile screen stays in it, hidden, under Sign in: a shared
  // id would point Sign in's badge at the hidden one, and it drew blank.
  const sky = `gymgo-sky-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View {...hidden} style={[styles.badge, { width: size, height: size, borderRadius: size * 0.225 }]}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Defs>
          <LinearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={ICON_SKY[0]} />
            <Stop offset="1" stopColor={ICON_SKY[1]} />
          </LinearGradient>
        </Defs>
        <Rect width={1024} height={1024} fill={`url(#${sky})`} />
        <G transform={`translate(${inset} ${inset}) scale(${MARK.iconScale})`}>
          <Shapes fill="#FFFFFF" />
        </G>
      </Svg>
    </View>
  );
}

/** The mark and "GymGO", `height` points tall. */
export function Wordmark({ height }: { height: number }) {
  const { box } = MARK;
  const w = WORDMARK;
  const scale = w.markHeight / box.height;
  const markWidth = box.width * scale;
  const baseline = (w.markHeight + w.cap) / 2;
  const width = markWidth + w.gap + w.width;
  const tall = Math.max(w.markHeight, baseline + w.descent);
  const indigo = logoIndigo();
  return (
    <View aria-label="GymGO" role="img" accessible accessibilityLabel="GymGO">
      <Svg width={(height * width) / tall} height={height} viewBox={`0 0 ${width.toFixed(1)} ${tall.toFixed(1)}`}>
        <G transform={`scale(${scale}) translate(${-box.x} ${-box.y})`}>
          <Shapes fill={indigo} />
        </G>
        <G transform={`translate(${markWidth + w.gap} ${baseline})`}>
          <Path d={w.gym} fill={color.label} />
          <Path d={w.go} fill={indigo} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { overflow: 'hidden', borderCurve: 'continuous' },
});
