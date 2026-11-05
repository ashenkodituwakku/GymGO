/**
 * A card you can tilt, as you'd turn a trading card in your hand to catch
 * the light: drag across it on a phone, or move a mouse over it in a
 * browser, and it leans towards you; let go and it springs back flat.
 * Only sideways drags tilt it, so the page still scrolls up and down from
 * on top of it. Still with Reduce Motion. Used on a card's own page.
 */

import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { tiltFor } from '@/lib/tilt';

const SPRING = { damping: 14, stiffness: 160, mass: 0.6 };

export function TiltCard({ children, still = false }: { children: ReactNode; /** Lying flat, at once and until it's false again: while a picture of it is made. */ still?: boolean }) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  useEffect(() => {
    if (!still) return;
    cancelAnimation(rotateX);
    cancelAnimation(rotateY);
    rotateX.value = 0;
    rotateY.value = 0;
  }, [still, rotateX, rotateY]);
  // Its size as laid out, for where on it a finger or the mouse is.
  const width = useSharedValue(1);
  const height = useSharedValue(1);

  const lean = (x: number, y: number) => {
    'worklet';
    if (still) return;
    const to = tiltFor(x / Math.max(1, width.value), y / Math.max(1, height.value));
    rotateX.value = withSpring(to.rotateX, SPRING);
    rotateY.value = withSpring(to.rotateY, SPRING);
  };
  const flat = () => {
    'worklet';
    rotateX.value = withSpring(0, SPRING);
    rotateY.value = withSpring(0, SPRING);
  };

  // A sideways drag tilts it; an up-and-down one is left to the page's scrolling.
  const drag = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onBegin((event) => lean(event.x, event.y))
    .onUpdate((event) => lean(event.x, event.y))
    .onFinalize(() => flat());
  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateX: `${rotateX.value}deg` }, { rotateY: `${rotateY.value}deg` }],
  }));

  if (reduceMotion) return <>{children}</>;
  // A mouse over it, in a browser: read from the browser's own pointer events on a layer that
  // doesn't tilt (the tilting card's box changes as it leans, which would make it shake).
  const mouse =
    Platform.OS === 'web'
      ? {
          onPointerMove: (event: { nativeEvent: PointerEvent; currentTarget: unknown }) => {
            if (event.nativeEvent.pointerType !== 'mouse' || event.nativeEvent.buttons) return;
            const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
            lean(event.nativeEvent.clientX - box.left, event.nativeEvent.clientY - box.top);
          },
          onPointerLeave: () => flat(),
        }
      : null;
  return (
    <View style={styles.tilt} {...(mouse as object)}>
      <GestureDetector gesture={drag}>
        <Animated.View
          style={style}
          onLayout={(event) => {
            width.value = event.nativeEvent.layout.width;
            height.value = event.nativeEvent.layout.height;
          }}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  tilt: { alignSelf: 'center' },
});
