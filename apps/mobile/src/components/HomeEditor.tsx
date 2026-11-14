/**
 * Customise Home, as an iPhone's Home Screen is edited: Home itself goes
 * into edit mode (Customise Home at its foot). Its widgets jiggle, each
 * with a − badge to take it off; hold one and drag it to move it, the
 * others sliding to make room and the page scrolling when you near an
 * edge; let go and it glides into its place. Under them, More widgets
 * shows every widget not on Home, to add with a tap; + on the editing bar
 * opens the gallery, Done ends it. Kept on this device (lib/homeLayout.ts).
 *
 * The motion is the browser's or the phone's own (Reanimated's CSS
 * animations and transitions): the jiggle, the making room. Only the held
 * widget follows the finger frame by frame. Reduce Motion: no jiggle.
 * A screen reader moves and removes widgets with each one's actions
 * (Move up, Move down, Take off Home).
 */

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type CSSAnimationKeyframes,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useDialogName } from '@/lib/dialogName';
import { haptic } from '@/lib/haptics';
import { HOME_GROUPS, homeWidget, type HomeWidget, type HomeWidgetId } from '@/lib/homeWidgets';
import { useBottomClearance } from '@/lib/layout';
import { useTapAgain } from '@/lib/tapAgain';
import { CHILD_TOUCH, PAGE_COLUMN, color, currentTheme, face, radius, shadow, space, themed } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { useTabScroll } from './ios';
import { Pressable } from './motion';
import { CloseButton, Txt } from './ui';

/** Room between widgets: Home's own, so nothing moves when editing starts. */
export const WIDGET_GAP = space[6];
/** The tallest a section (gyms near you, cities) shows while editing, and a preview in the tray or gallery. */
const CLIP = 300;
const PREVIEW = 190;
/** How close to an edge a held widget scrolls the page, how fast at most (points a frame), and how far it must move first. */
const EDGE = 64;
const FASTEST = 20;
const MOVED = 12;
/** How the others make room, and how the held one settles into its place. */
const MAKE_ROOM_MS = 200;
const SETTLE_MS = 170;

/** The jiggle: a small tilt one way and the other, as on an iPhone. */
const JIGGLE: CSSAnimationKeyframes = {
  '0%': { transform: [{ rotate: '-0.5deg' }] },
  '50%': { transform: [{ rotate: '0.5deg' }] },
  '100%': { transform: [{ rotate: '-0.5deg' }] },
};

interface Drag {
  /** The held widget's id, '' for none; where it was and where it would go; its height. */
  id: SharedValue<string>;
  from: SharedValue<number>;
  to: SharedValue<number>;
  h: SharedValue<number>;
  /** The finger's own travel, the held widget's offset (the page's scroll since included), where the finger is on the screen. */
  ty: SharedValue<number>;
  y: SharedValue<number>;
  absY: SharedValue<number>;
  startScroll: SharedValue<number>;
  lift: SharedValue<number>;
  /** Let go: nothing follows the finger or scrolls the page while it glides into its place. */
  released: SharedValue<boolean>;
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

/** The foot of something cut off: it fades into `colour` rather than stopping dead. */
function Fade({ colour }: { colour: string }) {
  const id = `fade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.fade, { pointerEvents: 'none' }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colour} stopOpacity={0} />
            <Stop offset="1" stopColor={colour} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Something to look at, not use: at most `max` tall, fading out if there's more. */
function Clipped({ max, fadeTo, children }: { max: number; fadeTo: string; children: ReactNode }) {
  const [tall, setTall] = useState(false);
  return (
    <View style={[styles.clip, { maxHeight: max }]}>
      <View style={{ pointerEvents: 'none' }} onLayout={(event) => setTall(event.nativeEvent.layout.height > max + 1)}>
        {children}
      </View>
      {tall && <Fade colour={fadeTo} />}
    </View>
  );
}

/** Home's widgets in edit mode, and those not on Home under them. `render` draws one as Home shows it (or EmptyWidget). */
export function EditableWidgets({
  ids,
  spare,
  render,
  onRemove,
  onMove,
  onAdd,
  onDragging,
}: {
  ids: HomeWidgetId[];
  /** The widgets not on Home, for More widgets. */
  spare: HomeWidget[];
  render: (id: HomeWidgetId) => ReactNode;
  onRemove: (id: HomeWidgetId) => void;
  onMove: (id: HomeWidgetId, to: number) => void;
  /** From More widgets: it joins the end of Home, just above. */
  onAdd: (id: HomeWidgetId) => void;
  /** While a widget's held, the page shouldn't scroll under the finger. */
  onDragging: (dragging: boolean) => void;
}) {
  const scroll = useTabScroll();
  const scrollY = scroll?.scrollY;
  const { height: windowHeight } = useWindowDimensions();
  const heights = useSharedValue<Record<string, number>>({});
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
    lift: useSharedValue(1),
    released: useSharedValue(false),
  };
  // What React draws from: the held widget and the place it would drop in (the others make room for it), and
  // whether the next frame moves without easing (the moment the new order takes over).
  const [held, setHeld] = useState<{ id: HomeWidgetId; from: number; h: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    order.value = ids;
  }, [ids, order]);

  /**
   * Where the held widget is, and the place it would drop in. Where each
   * widget starts is worked out from the heights (they're a stack,
   * WIDGET_GAP apart): a browser reports a widget's size when it changes,
   * not its place when one above it grows.
   */
  const place = () => {
    'worklet';
    const now = scrollY ? scrollY.value : 0;
    drag.y.value = drag.ty.value + (now - drag.startScroll.value);
    const tops: Record<string, number> = {};
    let top = 0;
    for (const each of order.value) {
      tops[each] = top;
      top += (heights.value[each] ?? 0) + WIDGET_GAP;
    }
    const mine = tops[drag.id.value];
    if (mine === undefined) return;
    const centre = mine + drag.h.value / 2 + drag.y.value;
    let to = 0;
    for (const other of order.value) {
      if (other === drag.id.value) continue;
      if (tops[other]! + (heights.value[other] ?? 0) / 2 < centre) to += 1;
    }
    if (to !== drag.to.value) {
      drag.to.value = to;
      runOnJS(setHover)(to);
      runOnJS(haptic.select)();
    }
  };

  // Near the top or the bottom, once the finger's moving, the page scrolls: faster the closer it is.
  useFrameCallback(() => {
    if (!scroll || drag.id.value === '' || drag.released.value || Math.abs(drag.ty.value) < MOVED) return;
    const top = scroll.insetTop + EDGE;
    const bottom = windowHeight - scroll.insetBottom - EDGE;
    const at = drag.absY.value;
    const speed = at < top ? -Math.min(FASTEST, (top - at) / 3 + 2) : at > bottom ? Math.min(FASTEST, (at - bottom) / 3 + 2) : 0;
    if (speed === 0) return;
    scrollTo(scroll.scroller, 0, Math.max(0, scroll.scrollY.value + speed), false);
    place();
  });

  // The new order is laid out, then the held widget loses its offset: in the same frame, so nothing jumps.
  const settle = useRef(false);
  useLayoutEffect(() => {
    if (!settle.current) return;
    settle.current = false;
    drag.id.value = '';
    drag.y.value = 0;
    drag.lift.value = 1;
    // Easing back on once the frame with the new order is drawn.
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const started = (id: HomeWidgetId, from: number, h: number) => {
    haptic.tap();
    setHeld({ id, from, h });
    setHover(from);
    onDragging(true);
  };
  const commit = (id: HomeWidgetId, to: number) => {
    setInstant(true);
    settle.current = true;
    setHeld(null);
    setHover(null);
    onMove(id, to);
  };
  const putBack = () => {
    drag.id.value = '';
    setHeld(null);
    setHover(null);
  };
  /** Let go: it glides to its new place (or back to its old), then the order is kept. */
  const dropped = (id: HomeWidgetId, from: number, to: number) => {
    onDragging(false);
    const list = order.value;
    let offset = 0;
    if (to > from) for (let at = from + 1; at <= to; at += 1) offset += (heights.value[list[at]!] ?? 0) + WIDGET_GAP;
    else for (let at = to; at < from; at += 1) offset -= (heights.value[list[at]!] ?? 0) + WIDGET_GAP;
    drag.lift.value = withTiming(1, { duration: SETTLE_MS });
    drag.y.value = withTiming(to === from ? 0 : offset, { duration: SETTLE_MS }, (finished) => {
      if (!finished) return;
      if (to === from) runOnJS(putBack)();
      else runOnJS(commit)(id, to);
    });
    if (to !== from) haptic.success();
  };

  return (
    <View style={styles.list}>
      {ids.map((id, index) => {
        // Making room: the ones between where it was and where it's going move by its height.
        let shift = 0;
        if (held && hover !== null && held.id !== id) {
          const step = held.h + WIDGET_GAP;
          if (held.from < hover && index > held.from && index <= hover) shift = -step;
          else if (held.from > hover && index >= hover && index < held.from) shift = step;
        }
        return (
          <EditItem
            key={id}
            id={id}
            index={index}
            last={index === ids.length - 1}
            shift={shift}
            instant={instant}
            holding={held?.id === id}
            drag={drag}
            heights={heights}
            scrollY={scrollY}
            place={place}
            onStart={started}
            onDrop={dropped}
            onRemove={() => onRemove(id)}
            onStep={(by) => onMove(id, Math.max(0, index + by))}
          >
            {render(id)}
          </EditItem>
        );
      })}

      {spare.length > 0 && (
        <View style={styles.tray}>
          <View style={styles.trayHead}>
            <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2}>
              MORE WIDGETS
            </Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              Not on your Home. Tap one to add it.
            </Txt>
          </View>
          {spare.map((widget) => (
            <View key={widget.id} style={styles.spare}>
              {/* The heading is the button: the preview under it has buttons of its own, and a button can't hold another. */}
              <Pressable
                onPress={() => {
                  haptic.success();
                  onAdd(widget.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Add ${widget.title} to Home: ${widget.detail}`}
                style={({ pressed }) => [styles.spareHead, pressed && styles.pressed]}
              >
                <View style={styles.addBadge}>
                  <Icon name="plus" size={13} color="#FFFFFF" weight="bold" />
                </View>
                <View style={styles.flex}>
                  <Txt variant="subhead" style={face('semibold')}>
                    {widget.title}
                  </Txt>
                  <Txt variant="caption" color={color.labelSecondary} numberOfLines={2}>
                    {widget.detail}
                  </Txt>
                </View>
                <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                  Add
                </Txt>
              </Pressable>
              <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Clipped max={PREVIEW} fadeTo={color.fill}>
                  {render(widget.id)}
                </Clipped>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function EditItem({
  id,
  index,
  last,
  shift,
  instant,
  holding,
  drag,
  heights,
  scrollY,
  place,
  onStart,
  onDrop,
  onRemove,
  onStep,
  children,
}: {
  id: HomeWidgetId;
  index: number;
  last: boolean;
  shift: number;
  instant: boolean;
  holding: boolean;
  drag: Drag;
  heights: SharedValue<Record<string, number>>;
  scrollY: SharedValue<number> | undefined;
  place: () => void;
  onStart: (id: HomeWidgetId, from: number, h: number) => void;
  onDrop: (id: HomeWidgetId, from: number, to: number) => void;
  onRemove: () => void;
  onStep: (by: -1 | 1) => void;
  children: ReactNode;
}) {
  const widget = homeWidget(id);
  const calm = useReducedMotion();

  // Hold, then drag: a quick swipe still scrolls the page.
  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart((event) => {
      const h = heights.value[id] ?? 0;
      drag.id.value = id;
      drag.from.value = index;
      drag.to.value = index;
      drag.h.value = h;
      drag.ty.value = 0;
      drag.y.value = 0;
      drag.absY.value = event.absoluteY;
      drag.startScroll.value = scrollY ? scrollY.value : 0;
      drag.lift.value = withTiming(1.035, { duration: 140 });
      drag.released.value = false;
      runOnJS(onStart)(id, index, h);
    })
    .onUpdate((event) => {
      if (drag.released.value) return;
      drag.ty.value = event.translationY;
      drag.absY.value = event.absoluteY;
      place();
    })
    .onFinalize(() => {
      if (drag.id.value !== id || drag.released.value) return;
      drag.released.value = true;
      runOnJS(onDrop)(id, drag.from.value, drag.to.value);
    });

  // Only the held one follows the finger, frame by frame.
  const follow = useAnimatedStyle(() => {
    const mine = drag.id.value === id;
    return { transform: [{ translateY: mine ? drag.y.value : 0 }, { scale: mine ? drag.lift.value : 1 }] };
  }, [id]);

  const framed = widget.bare === true;
  return (
    <Animated.View
      // Making room, as the browser or phone animates it (none at the moment the new order takes over).
      style={[
        styles.item,
        { zIndex: holding ? 20 : 1, transform: [{ translateY: shift }], transitionProperty: 'transform', transitionDuration: instant ? 0 : MAKE_ROOM_MS, transitionTimingFunction: 'ease-out' },
      ]}
      onLayout={(event) => {
        heights.value = { ...heights.value, [id]: event.nativeEvent.layout.height };
      }}
    >
      <Animated.View style={[follow, holding && styles.lifted]}>
        <Animated.View
          style={
            calm || holding
              ? null
              : { animationName: JIGGLE, animationDuration: 300 + (index % 3) * 20, animationDelay: (index * 70) % 300, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }
          }
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
              style={framed ? styles.frame : undefined}
            >
              {/* For looking at while editing: its own buttons wait till Done. */}
              {framed ? (
                <Clipped max={CLIP} fadeTo={color.plate}>
                  {children}
                </Clipped>
              ) : (
                <View style={{ pointerEvents: 'none' }}>{children}</View>
              )}
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
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The editing bar, floating above the tab bar where a thumb reaches: + for
 * the gallery, how to move a widget, and Done. Nothing at the top of Home
 * moves to make room for it.
 */
export function EditBar({ onAdd, onDone }: { onAdd: () => void; onDone: () => void }) {
  const clearance = useBottomClearance();
  return (
    <View style={[CHILD_TOUCH, styles.bar, { bottom: clearance + space[2] }]}>
      <Glass style={styles.barGlass}>
        <Pressable
          onPress={() => {
            haptic.select();
            onAdd();
          }}
          accessibilityRole="button"
          accessibilityLabel="Add a widget"
          hitSlop={6}
          style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
        >
          <Icon name="plus" size={18} color={color.brand} weight="bold" />
        </Pressable>
        <Txt variant="caption" color={color.labelSecondary} style={styles.flex} numberOfLines={2}>
          Hold a widget to move it. − takes it off.
        </Txt>
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
      </Glass>
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
  const { height } = useWindowDimensions();
  const [resetting, setResetting] = useTapAgain();
  const dialogName = useDialogName('Widgets');
  // An explicit height: a browser let the sheet grow to all its widgets, and then it couldn't scroll.
  const top = insets.top + space[6];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} ref={dialogName}>
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
                      <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <Clipped max={PREVIEW} fadeTo={color.fill}>
                          {render(widget.id)}
                        </Clipped>
                      </View>
                      <View style={styles.galleryWords}>
                        <View style={styles.flex}>
                          <Txt variant="headline">{widget.title}</Txt>
                          <Txt variant="footnote" color={color.labelSecondaryOnFill}>
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
    // A mouse held and dragged would select the words under it as it goes.
    list: { gap: WIDGET_GAP, userSelect: 'none' },
    item: { position: 'relative' },
    lifted: { ...shadow.float },
    // A section of the page, framed while editing so it has edges to hold.
    frame: { padding: space[3], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, overflow: 'hidden', ...shadow.plate },
    clip: { overflow: 'hidden' },
    fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
    // iOS's badges: grey with a white minus to take off, green with a white plus to add.
    remove: {
      position: 'absolute',
      top: -8,
      left: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: dark ? '#636366' : '#8E8E93',
      borderWidth: 2,
      borderColor: color.groupedBackground,
      zIndex: 30,
    },
    addBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#34C759' },
    pressed: { opacity: 0.6 },
    empty: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] + 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    tile: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    tray: { gap: space[3], marginTop: space[2] },
    trayHead: { gap: 2, marginLeft: space[1] },
    spare: { gap: space[3], padding: space[3], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.fill },
    spareHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    bar: { position: 'absolute', left: space[4], right: space[4], alignItems: 'center', zIndex: 40 },
    barGlass: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      width: '100%',
      maxWidth: 440,
      paddingLeft: space[2],
      paddingRight: space[2],
      paddingVertical: space[2],
      borderRadius: 28,
      ...shadow.float,
    },
    plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    done: { paddingHorizontal: space[4], height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandFill },
    scrim: { backgroundColor: color.scrim },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
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
    galleryWords: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], height: 44, borderRadius: 22, backgroundColor: color.brandTint },
    add: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[4], height: 38, borderRadius: 19, backgroundColor: color.brandFill },
  });
});
