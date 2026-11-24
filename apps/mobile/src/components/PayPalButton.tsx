/**
 * PayPal's own button: just its wordmark, on PayPal's colours, as PayPal
 * draws its checkout buttons. PayPal's light blue with the black wordmark on
 * a light page; white on a dark one, as PayPal's guidance says for contrast
 * (its gold button became blue in August 2026).
 *
 * The wordmark is PayPal's, unchanged, from its published button artwork
 * (paypalobjects.com/ppdevdocs/new-blue.svg), cropped to the letters. It's
 * PayPal's trademark, shown here as PayPal intends: on the button that pays
 * with PayPal.
 */

import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { haptic } from '@/lib/haptics';
import { NO_TOUCH, currentTheme, radius, themed } from '@/lib/theme';
import { Pressy } from './motion';

/** PayPal's button colours: its blue (and a touch darker under the mouse), white for a dark page. */
const PAYPAL = {
  light: { fill: '#60CDFF', hover: '#55BDEC', ink: '#000000' },
  dark: { fill: '#FFFFFF', hover: '#EDEDED', ink: '#000000' },
} as const;

/** The letters of PayPal's wordmark, in its button artwork's own units. */
const WORDMARK = [
  'M182.554 12.8485V29.653H178.748V12.8485H182.554Z',
  'M177.344 18.5153V29.6765H173.961V28.716C173.534 29.1336 173.045 29.452 172.501 29.6765C171.956 29.9141 171.366 30.0341 170.732 30.0341C169.935 30.0341 169.198 29.8853 168.52 29.5878C167.842 29.2745 167.253 28.8517 166.751 28.3166C166.249 27.7815 165.851 27.1551 165.556 26.4425C165.276 25.7142 165.137 24.9312 165.137 24.0985C165.137 23.2658 165.276 22.4906 165.556 21.778C165.851 21.0498 166.249 20.4155 166.751 19.8804C167.253 19.3453 167.842 18.9277 168.52 18.6301C169.198 18.3169 169.935 18.1603 170.732 18.1603C171.366 18.1603 171.956 18.2803 172.501 18.5179C173.047 18.7424 173.534 19.0608 173.961 19.4784V18.5179H177.344V18.5153ZM171.348 26.6408C172.041 26.6408 172.608 26.4033 173.05 25.9257C173.508 25.4506 173.735 24.8398 173.735 24.0959C173.735 23.352 173.508 22.7412 173.05 22.2661C172.608 21.7911 172.038 21.5509 171.348 21.5509C170.657 21.5509 170.08 21.7885 169.622 22.2661C169.18 22.7412 168.957 23.352 168.957 24.0959C168.957 24.8398 169.18 25.4506 169.622 25.9257C170.08 26.4007 170.654 26.6408 171.348 26.6408Z',
  'M159.711 12.8459C160.715 12.8459 161.568 12.9868 162.277 13.2687C162.986 13.5506 163.584 13.9448 164.07 14.4512C164.572 14.9732 164.962 15.5683 165.242 16.2365C165.521 16.9074 165.661 17.6278 165.661 18.403C165.661 19.1783 165.521 19.8987 165.242 20.5695C164.962 21.2403 164.572 21.8354 164.07 22.3549C163.584 22.8613 162.986 23.2554 162.277 23.5373C161.568 23.8192 160.715 23.9602 159.711 23.9602H157.874V29.6739H154.002V12.8459H159.708H159.711ZM159.157 20.5016C159.675 20.5016 160.071 20.4494 160.353 20.345C160.647 20.2249 160.891 20.0762 161.082 19.8987C161.48 19.5254 161.68 19.0269 161.68 18.403C161.68 17.7792 161.48 17.2806 161.082 16.9074C160.891 16.7299 160.647 16.5863 160.353 16.4845C160.073 16.3644 159.675 16.307 159.157 16.307H157.874V20.5042H159.157V20.5016Z',
  'M139.739 18.5153H143.943L146.796 23.8714H146.84L149.383 18.5153H153.277L144.936 35.3459H141.064L144.869 27.6458L139.737 18.5153H139.739Z',
  'M138.986 18.5153V29.6765H135.602V28.716C135.175 29.1336 134.686 29.452 134.143 29.6765C133.597 29.9141 133.007 30.0341 132.374 30.0341C131.577 30.0341 130.84 29.8853 130.162 29.5878C129.484 29.2745 128.894 28.8517 128.392 28.3166C127.891 27.7815 127.492 27.1551 127.197 26.4425C126.918 25.7142 126.778 24.9312 126.778 24.0985C126.778 23.2658 126.918 22.4906 127.197 21.778C127.492 21.0498 127.891 20.4155 128.392 19.8804C128.894 19.3453 129.484 18.9277 130.162 18.6301C130.84 18.3169 131.577 18.1603 132.374 18.1603C133.007 18.1603 133.597 18.2803 134.143 18.5179C134.689 18.7424 135.175 19.0608 135.602 19.4784V18.5179H138.986V18.5153ZM132.989 26.6408C133.683 26.6408 134.249 26.4033 134.694 25.9257C135.152 25.4506 135.38 24.8398 135.38 24.0959C135.38 23.352 135.152 22.7412 134.694 22.2661C134.252 21.7911 133.683 21.5509 132.989 21.5509C132.296 21.5509 131.722 21.7885 131.264 22.2661C130.822 22.7412 130.599 23.352 130.599 24.0959C130.599 24.8398 130.822 25.4506 131.264 25.9257C131.722 26.4007 132.296 26.6408 132.989 26.6408Z',
  'M121.51 12.8459C122.514 12.8459 123.368 12.9868 124.077 13.2687C124.785 13.5506 125.383 13.9448 125.869 14.4512C126.371 14.9732 126.762 15.5683 127.041 16.2365C127.321 16.9074 127.46 17.6278 127.46 18.403C127.46 19.1783 127.321 19.8987 127.041 20.5695C126.762 21.2403 126.371 21.8354 125.869 22.3549C125.383 22.8613 124.785 23.2554 124.077 23.5373C123.368 23.8192 122.514 23.9602 121.51 23.9602H119.674V29.6739H115.804V12.8459H121.51ZM120.959 20.5016C121.477 20.5016 121.873 20.4494 122.155 20.345C122.449 20.2249 122.693 20.0762 122.884 19.8987C123.282 19.5254 123.482 19.0269 123.482 18.403C123.482 17.7792 123.282 17.2806 122.884 16.9074C122.693 16.7299 122.449 16.5863 122.155 16.4845C121.875 16.3644 121.477 16.307 120.959 16.307H119.676V20.5042H120.959V20.5016Z',
];
/** The letters' box in that artwork (its 300 × 45 button). */
const BOX = { x: 115.80, y: 12.85, width: 66.75, height: 22.50 };

export function PayPalWordmark({ height, color }: { height: number; color: string }) {
  return (
    <Svg width={(height * BOX.width) / BOX.height} height={height} viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`} style={NO_TOUCH} aria-hidden>
      {WORDMARK.map((d) => (
        <Path key={d.slice(0, 24)} d={d} fill={color} />
      ))}
    </Svg>
  );
}

export function PayPalButton({ onPress, busy = false, disabled = false }: { onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const colours = PAYPAL[currentTheme().scheme === 'dark' ? 'dark' : 'light'];
  const [hovered, setHovered] = useState(false);
  return (
    <Pressy
      disabled={disabled || busy}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel="Pay with PayPal"
      aria-disabled={disabled || busy}
      aria-busy={busy}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: hovered && !busy ? colours.hover : colours.fill },
        pressed && { opacity: 0.9 },
        disabled && !busy && { opacity: 0.45 },
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={colours.ink} /> : <PayPalWordmark height={22} color={colours.ink} />}
    </Pressy>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // The size and corners of the app's own main button (PrimaryButton), so the two read as a pair.
    button: {
      minHeight: 52,
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
  }),
);
