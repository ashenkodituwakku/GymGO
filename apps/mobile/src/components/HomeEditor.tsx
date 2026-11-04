/**
 * Customise Home, as an iPhone's Home Screen is edited: Home itself goes
 * into edit mode (Customise Home at its foot). Its widgets jiggle, each
 * with a − badge to take it off; hold one and drag it to move it, the
 * others making room, the page scrolling when you near an edge; + at the
 * top opens the widget gallery, with each widget shown as it would look,
 * to add one at the top; Done ends it. Kept on this device
 * (lib/homeLayout.ts).
 *
 * Reduce Motion: no jiggle. A screen reader moves and removes them with
 * each widget's actions (Move up, Move down, Take off Home).
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  scrollTo,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { useTapAgain } from '@/lib/tapAgain';
import { HOME_GROUPS, homeWidget, type HomeWidget, type HomeWidgetId } from '@/lib/homeWidgets';
import { PAGE_COLUMN, color, currentTheme, face, radius, shadow, space, themed } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { useTabScroll } from './ios';
import { Pressable } from './motion';
import { CloseButton, Txt } from './ui';

/** Room between widgets while editing, and the tallest a widget shows (the rest is cut off till Done). */
const GAP = space[5];
const CLIP = 230;
/** How close to an edge a dragged widget scrolls the page, and how fast at most (points a frame). */
const EDGE = 70;
const FASTEST = 14;

interface Drag {
  id: SharedValue<string>;
  from: SharedValue<number>;
  to: SharedValue<number>;
  /** The dragged widget's height, so the others move by it. */
  h: SharedValue<number>;
  /** The finger's own travel, the page's since the drag began, and where it is on the screen. */
  ty: SharedValue<number>;
  y: SharedValue<number>;
  absY: SharedValue<number>;
  startScroll: SharedValue<number>;
}

/** A widget with nothing to show yet, as it waits on Home while editing and in the gallery. */
export function EmptyWidget({ id }: { id: HomeWidgetId }) {
  const widget = homeWidget(id);
  return (
    <View style={styles.empty}>
      <View style={styles.tile}>
        <Icon name={widget.icon} size={16} color={color.brand} />
      </View>
      <View style={styles.flex}>
        <Txt variant="subhead" style={face('semibold')}>
          {widget.title}
        </Txt>
        <Txt variant="caption" color={color.labelSecondary}>
          {widget.whenThere ?? 'Nothing to show here yet.'}
        </Txt>
      </View>
    </View>
  );
}

/** Home's widgets in edit mode. `render` draws one as Home shows it (or EmptyWidget). */
export function EditableWidgets({
  ids,
  render,
  onRemove,
  onMove,
  onDragging,
}: {
  ids: HomeWidgetId[];
  render: (id: HomeWidgetId) => ReactNode;
  onRemove: (id: HomeWidgetId) => void;
  onMove: (id: HomeWidgetId, to: number) => void;
  /** While a widget's held, the page shouldn't scroll under the finger. */
  onDragging: (dragging: boolean) => void;
}) {
  const scroll = useTabScroll();
  const { height: windowHeight } = useWindowDimensions();
  const layouts = useSharedValue<Record<string, { y: number; h: number }>>({});
  const order = useSharedValue<string[]>(ids);
  const drag: Drag = {
    id: useSharedValue(''),
    from: useSharedValue(-1),
    to: useSharedValue(-1),
    h: useSharedValue(0),
    ty: useSharedValue(0),
    y: useSharedValue(0),
    absY: useSharedValue(0),
    startScroll: useSharedValue(0),
  };
  const scrollY = scroll?.scrollY;

  useEffect(() => {
    order.value = ids;
  }, [ids, order]);

  // A widget just added goes to the top: the page goes there too, to show it.
  const before = useRef(ids);
  useEffect(() => {
    const added = ids[0] && !before.current.includes(ids[0]);
    before.current = ids;
    if (added) scroll?.scroller.current?.scrollTo({ y: 0, animated: true });
  }, [ids, scroll]);

  /**
   * Where the dragged widget is, and the place it would drop in. Where each
   * widget starts is worked out from their heights (they're a stack, GAP
   * apart): a browser reports a widget's size when it changes, but not its
   * place when one above it grows.
   */
  const place = () => {
    'worklet';
    const now = scrollY ? scrollY.value : 0;
    drag.y.value = drag.ty.value + (now - drag.startScroll.value);
    const tops: Record<string, number> = {};
    let top = 0;
    for (const each of order.value) {
      tops[each] = top;
      top += (layouts.value[each]?.h ?? 0) + GAP;
    }
    const mineTop = tops[drag.id.value];
    if (mineTop === undefined) return;
    const centre = mineTop + drag.h.value / 2 + drag.y.value;
    let to = 0;
    for (const other of order.value) {
      if (other === drag.id.value) continue;
      if (tops[other]! + (layouts.value[other]?.h ?? 0) / 2 < centre) to += 1;
    }
    if (to !== drag.to.value) {
      drag.to.value = to;
      runOnJS(haptic.select)();
    }
  };

  // Near the top or the bottom, the page scrolls, faster the closer the finger.
  useFrameCallback(() => {
    if (!scroll || drag.id.value === '') return;
    const top = scroll.insetTop + EDGE;
    const bottom = windowHeight - scroll.insetBottom - EDGE;
    const at = drag.absY.value;
    const speed = at < top ? -Math.min(FASTEST, (top - at) / 3 + 2) : at > bottom ? Math.min(FASTEST, (at - bottom) / 3 + 2) : 0;
    if (speed === 0) return;
    scrollTo(scroll.scroller, 0, Math.max(0, scroll.scrollY.value + speed), false);
    place();
  });

  // Let go: the new order is laid out, then the widgets lose their shifts, so nothing jumps back first.
  const settle = useRef(false);
  const reset = () => {
    drag.id.value = '';
    drag.from.value = -1;
    drag.to.value = -1;
    drag.y.value = 0;
  };
  useLayoutEffect(() => {
    if (!settle.current) return;
    settle.current = false;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  const started = () => {
    haptic.tap();
    onDragging(true);
  };
  const dropped = (id: string, from: number, to: number) => {
    onDragging(false);
    if (from === to || to < 0) {
      reset();
      return;
    }
    haptic.success();
    settle.current = true;
    onMove(id as HomeWidgetId, to);
  };

  return (
    <View style={styles.list}>
      {ids.map((id, index) => (
        <EditItem
          key={id}
          id={id}
          index={index}
          last={index === ids.length - 1}
          drag={drag}
          layouts={layouts}
          scrollY={scrollY}
          place={place}
          onLayout={(y, h) => {
            layouts.value = { ...layouts.value, [id]: { y, h } };
          }}
          onStart={started}
          onDrop={dropped}
          onRemove={() => onRemove(id)}
          onStep={(by) => onMove(id, Math.max(0, index + by))}
        >
          {render(id)}
        </EditItem>
      ))}
    </View>
  );
}

function EditItem({
  id,
  index,
  last,
  drag,
  layouts,
  scrollY,
  place,
  onLayout,
  onStart,
  onDrop,
  onRemove,
  onStep,
  children,
}: {
  id: HomeWidgetId;
  index: number;
  last: boolean;
  drag: Drag;
  layouts: SharedValue<Record<string, { y: number; h: number }>>;
  scrollY: SharedValue<number> | undefined;
  place: () => void;
  onLayout: (y: number, h: number) => void;
  onStart: () => void;
  onDrop: (id: string, from: number, to: number) => void;
  onRemove: () => void;
  onStep: (by: -1 | 1) => void;
  children: ReactNode;
}) {
  const widget = homeWidget(id);
  const calm = useReducedMotion();
  const wiggle = useSharedValue(0);

  // The jiggle: each a little out of step with its neighbours, as on an iPhone.
  useEffect(() => {
    if (calm) return;
    const half = 120 + (index % 3) * 14;
    wiggle.value = withDelay((index * 53) % 150, withRepeat(withSequence(withTiming(1, { duration: half }), withTiming(-1, { duration: half })), -1, true));
    return () => {
      cancelAnimation(wiggle);
      wiggle.value = 0;
    };
  }, [calm, index, wiggle]);

  // Hold, then drag: a quick swipe still scrolls the page.
  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart((event) => {
      drag.id.value = id;
      drag.from.value = index;
      drag.to.value = index;
      drag.h.value = layouts.value[id]?.h ?? 0;
      drag.ty.value = 0;
      drag.y.value = 0;
      drag.absY.value = event.absoluteY;
      drag.startScroll.value = scrollY ? scrollY.value : 0;
      runOnJS(onStart)();
    })
    .onUpdate((event) => {
      drag.ty.value = event.translationY;
      drag.absY.value = event.absoluteY;
      place();
    })
    .onFinalize(() => {
      if (drag.id.value === id) runOnJS(onDrop)(id, drag.from.value, drag.to.value);
    });

  const style = useAnimatedStyle(() => {
    const active = drag.id.value;
    const mine = active === id;
    let shift = 0;
    if (active !== '' && !mine) {
      const from = drag.from.value;
      const to = drag.to.value;
      const step = drag.h.value + GAP;
      if (from < to && index > from && index <= to) shift = -step;
      else if (from > to && index >= to && index < from) shift = step;
    }
    return {
      zIndex: mine ? 20 : 1,
      transform: [
        { translateY: mine ? drag.y.value : active === '' ? 0 : withTiming(shift, { duration: 170 }) },
        { scale: withTiming(mine ? 1.04 : 1, { duration: 140 }) },
        { rotate: `${mine ? 0 : wiggle.value * 0.7}deg` },
      ],
    };
  }, [id, index]);

  return (
    <Animated.View
      entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      style={[styles.item, style]}
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        onLayout(y, height);
      }}
    >
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityLabel={`${widget.title}. Hold and drag to move it.`}
          accessibilityActions={[
            ...(index > 0 ? [{ name: 'moveUp', label: 'Move up' }] : []),
            ...(!last ? [{ name: 'moveDown', label: 'Move down' }] : []),
            { name: 'remove', label: 'Take off Home' },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'moveUp') onStep(-1);
            else if (event.nativeEvent.actionName === 'moveDown') onStep(1);
            else if (event.nativeEvent.actionName === 'remove') onRemove();
          }}
          // The widget is for looking at while editing: its own buttons wait till Done.
          style={styles.body}
        >
          <View style={[styles.clip, { pointerEvents: 'none' }]}>{children}</View>
        </View>
      </GestureDetector>
      <Pressable
        onPress={() => {
          haptic.select();
          onRemove();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Take ${widget.title} off Home`}
        hitSlop={10}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
      >
        <Icon name="minus" size={13} color="#FFFFFF" weight="bold" />
      </Pressable>
    </Animated.View>
  );
}

/** Over the top of Home while editing: + for the gallery, Done to finish. */
export function EditBar({ onAdd, onDone }: { onAdd: () => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { top: insets.top + space[2] }]} pointerEvents="box-none">
      <View style={styles.barRow} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            haptic.select();
            onAdd();
          }}
          accessibilityRole="button"
          accessibilityLabel="Add a widget"
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Glass style={styles.plus} interactive>
            <Icon name="plus" size={18} color={color.label} weight="bold" />
          </Glass>
        </Pressable>
        <Pressable
          onPress={() => {
            haptic.success();
            onDone();
          }}
          accessibilityRole="button"
          accessibilityLabel="Done customising Home"
          style={({ pressed }) => [styles.done, pressed && styles.pressed]}
        >
          <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
            Done
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

/** The widget gallery, as an iPhone's: each one shown as it would look, to add at the top of Home. */
export function WidgetGallery({
  visible,
  widgets,
  render,
  onAdd,
  onReset,
  onClose,
}: {
  visible: boolean;
  widgets: HomeWidget[];
  render: (id: HomeWidgetId) => ReactNode;
  onAdd: (id: HomeWidgetId) => void;
  /** Home as it came, its widgets and their order. */
  onReset: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [resetting, setResetting] = useTapAgain();
  const { height } = useWindowDimensions();
  // An explicit height: a browser let the sheet grow to all its widgets, and then it couldn't scroll.
  const top = insets.top + space[6];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessible={false} importantForAccessibility="no" />
        <View style={[styles.sheet, { top, height: height - top }]} accessibilityViewIsModal>
          <View style={styles.sheetHead}>
            <View style={styles.flex}>
              <Txt variant="title2" accessibilityRole="header">
                Widgets
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                Add one, and it goes to the top of Home.
              </Txt>
            </View>
            <CloseButton onPress={onClose} />
          </View>
          <ScrollView style={styles.flexFill} contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + space[8] }]}>
            {widgets.length === 0 && (
              <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
                Every widget is on your Home.
              </Txt>
            )}
            {HOME_GROUPS.map((group) => {
              const here = widgets.filter((widget) => widget.group === group);
              if (here.length === 0) return null;
              return (
                <View key={group} style={styles.galleryGroup}>
                  <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2}>
                    {group.toUpperCase()}
                  </Txt>
                  {here.map((widget) => (
                    <View key={widget.id} style={styles.galleryItem}>
                      {/* As it would look on Home, for looking at only. */}
                      <View style={[styles.preview, { pointerEvents: 'none' }]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        {render(widget.id)}
                      </View>
                      <View style={styles.galleryWords}>
                        <View style={styles.flex}>
                          <Txt variant="headline">{widget.title}</Txt>
                          <Txt variant="footnote" color={color.labelSecondary}>
                            {widget.detail}
                          </Txt>
                        </View>
                        <Pressable
                          onPress={() => {
                            haptic.success();
                            onAdd(widget.id);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${widget.title} to Home`}
                          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
                        >
                          <Icon name="plus" size={14} color={color.onBrand} weight="bold" />
                          <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
                            Add
                          </Txt>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
            <Pressable
              onPress={() => {
                if (!resetting) {
                  haptic.select();
                  return setResetting(true);
                }
                haptic.success();
                setResetting(false);
                onReset();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
            >
              <Icon name="refresh" size={14} color={color.brand} />
              <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                {resetting ? 'Tap again to put Home back' : 'Put Home back as it came'}
              </Txt>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() => {
  const dark = currentTheme().scheme === 'dark';
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    flexFill: { flex: 1 },
    center: { textAlign: 'center' },
    list: { gap: GAP, paddingTop: space[2] },
    item: { position: 'relative' },
    body: { borderRadius: radius.lg },
    clip: { maxHeight: CLIP, overflow: 'hidden', borderRadius: radius.lg },
    // iOS's badge: grey, with a white minus, at the widget's top left.
    remove: {
      position: 'absolute',
      top: -9,
      left: -9,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: dark ? '#636366' : '#8E8E93',
      borderWidth: 2,
      borderColor: color.groupedBackground,
      zIndex: 30,
    },
    pressed: { opacity: 0.6 },
    empty: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] + 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    tile: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    bar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: space[4], zIndex: 40 },
    barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: PAGE_COLUMN, alignSelf: 'center' },
    plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    done: { paddingHorizontal: space[4], height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandFill, ...shadow.plate },
    scrim: { backgroundColor: color.scrim },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: PAGE_COLUMN,
      alignSelf: 'center',
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderCurve: 'continuous',
      backgroundColor: color.groupedBackground,
      overflow: 'hidden',
      ...shadow.card,
    },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[3] },
    sheetBody: { paddingHorizontal: space[4], gap: space[6] },
    galleryGroup: { gap: space[3] },
    galleryItem: { gap: space[3], padding: space[3], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.fill },
    preview: { maxHeight: 190, overflow: 'hidden', borderRadius: radius.lg },
    galleryWords: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], height: 44, borderRadius: 22, backgroundColor: color.brandTint },
    add: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[4], height: 38, borderRadius: 19, backgroundColor: color.brandFill },
  });
});
