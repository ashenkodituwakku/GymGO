/**
 * GymPal, GymGO's AI assistant, a tap away on every signed-in screen, which
 * opens a chat. How he waits is yours to choose in Appearance (lib/themePrefs.ts
 * `gymPalButton`, `gymPalSide`), and none of it covers what you're reading:
 *  - **Edge tab** (the default): a small tab flush with the screen's right
 *    (or left) edge, low down where a thumb reaches; tap it, or pull it in.
 *  - **Corner**: his button in the bottom corner, as he started.
 *  - **Hidden**: nothing to see; on a phone, swipe in from that edge near
 *    the bottom (a strip a fingertip wide), or Profile → Ask GymPal.
 * In a browser, Ctrl+/ (⌘/ on a Mac) opens and closes him from anywhere,
 * whichever you chose. It always opens on GymPal's
 * greeting, with two or three questions to start from that fit the screen
 * (lib/gymPalSuggestions.ts). The conversation stays while the app is open
 * (Start over clears it) and is never stored anywhere.
 *
 * Screens open him too (components/AskGymPal.tsx, lib/gymPalBus.ts): "Ask
 * GymPal about this plan" asks at once and tells him what the screen shows,
 * which the chat names under its heading ("About: this workout") until
 * Start over, another screen's, or its ✕.
 *
 * With GymGO Pro he answers more questions a day (100, not 20), remembers
 * more of the conversation and answers at more length, and the chat has a
 * switch to let him see your training log: a summary the server makes of
 * your latest sessions, never their gyms or notes. Off to start; on Free
 * it shows locked and opens the Pro screen.
 *
 * His logo, assets/gympal/gympal.svg: a speech bubble holding a dumbbell,
 * on a tile of GymGO's blue-violet, in two layers (lib/gymPalArt.ts, from
 * scripts/gympal-logo.mjs). The dumbbell lifts once as his tab appears, and
 * in the chat as it opens and with each answer; otherwise it keeps still, so
 * nothing in the corner of your eye moves. Still with Reduce Motion.
 *
 * Answers come from a free AI model through the GymGO server
 * (apps/server/src/gymPal.ts), which hands the model GymPal's guide to the
 * app and the rules about real gyms' facts. Until it can answer (the
 * website, with no server behind it, or a server without the owner's
 * OpenRouter key), each question gets GymPal's apology that it's still
 * being set up; once the key is in, the next question goes through.
 *
 * His tab or button keeps out of the way where the corner is busy: a workout
 * in progress (its rest timer sits there), the welcome tour, and the screens
 * that open as sheets. The chat itself opens from any of them.
 */

import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputKeyPressEvent,
  type ScrollViewInstance,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { ApiError, OfflineError, api, apiBase, problemText, type ChatTurn } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { onGymPalRequest } from '@/lib/gymPalBus';
import { GYMPAL_BODY, GYMPAL_DUMBBELL } from '@/lib/gymPalArt';
import { suggestionsFor } from '@/lib/gymPalSuggestions';
import { haptic } from '@/lib/haptics';
import { tabBarBottom } from '@/lib/layout';
import { useThemeChoice } from '@/lib/themePrefs';
import { MENU_BUTTON, SIDEBAR_WIDTH, navMode } from '@/lib/navLayout';
import { LIMITED } from '@/lib/limited';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';
import { Icon } from './Icon';
import { POP_IN, Pressable, usePressScale } from './motion';
import { Toggle } from './Toggle';
import { CloseButton, Txt } from './ui';

export const GREETING = 'Hi! I’m GymPal your personal assistant, ask me anything!';

/** What the server takes: the latest 10 messages, or 30 with Pro, each question under 1,000 characters. */
const KEEP = { free: 10, pro: 30 };
const MAX_QUESTION = 1000;
/** The corner button, and the tab on the edge: how far it sticks out and how tall it is. */
const BUTTON = 52;
const TAB = { wide: 34, tall: 52, mark: 24 };
/** How far a pull on the tab (or the hidden strip) must go to open him, and how wide the strip is. */
const PULL_OPENS = 28;
const STRIP = 14;
const EDGE = 16;
/** The tab bar's height and widest (app/(tabs)/_layout.tsx). */
const TAB_BAR = 64;
const TAB_BAR_MAX = 400;
/** From this wide, the chat is a panel in the corner rather than a sheet. */
const PANEL_FROM = 640;

const TABS = new Set(['/', '/explore', '/saved', '/profile']);
/** Where the corner is someone else's: no button there, though screens there can still open the chat. */
const HIDDEN = new Set(['/train', '/welcome', '/compare', '/plates', '/pro', '/country', '/sign-in', '/report-bug']);

/** Where the dumbbell's middle is, as shares of the logo (assets/gympal/gympal.svg's 100-unit box): what it lifts about. */
const DUMBBELL_AT = '50% 48%';

/** The keys that open and close him in a browser. */
const ON_MAC = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
export const GYMPAL_KEYS = ON_MAC ? '⌘ /' : 'Ctrl + /';

/**
 * A message. `waited` marks a question answered only with WAITING, and that
 * answer, which are never sent on; `about` names what the screen told
 * GymPal with the question, shown under it.
 */
type Line = ChatTurn & { id: number; waited?: boolean; about?: string };
/** Whether GymPal can answer here: not asked yet, yes, not set up (no server, or no key on it), or the server can't be reached. */
type State = 'unknown' | 'on' | 'off' | 'away';
/** What a screen told GymPal: its name for the person, and the lines sent. */
type Topic = { label: string; text: string };

/** GymPal's answer while it isn't set up. */
export const WAITING = 'Sorry, we’re waiting for GymPal to be set up. Check back soon!';

let nextId = 1;

export function GymPal() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // How and on which side he waits, and the layout (Appearance).
  const { gymPalSide: side, gymPalButton: button, layout } = useThemeChoice();
  const { width } = useWindowDimensions();
  const mode = navMode(layout, width);
  const { billing, openPro } = useApp();
  const pro = billing.isPro;
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<{ text: string; toPro?: boolean } | null>(null);
  const [state, setState] = useState<State>('unknown');
  const [topic, setTopic] = useState<Topic | null>(null);
  const [useLog, setUseLog] = useState(false);
  // Pro ended: the log stays home.
  useEffect(() => {
    if (!pro) setUseLog(false);
  }, [pro]);

  /** Whether GymPal can answer now: the website with no server behind it can't, and a server says whether it has the key. */
  const check = useCallback(async (): Promise<State> => {
    let next: State;
    if (!apiBase()) next = 'off';
    else {
      try {
        next = (await api.gymPal()).on ? 'on' : 'off';
      } catch (error) {
        next = error instanceof OfflineError ? 'away' : 'off';
      }
    }
    setState(next);
    return next;
  }, []);

  /** GymPal's apology for not being set up yet, after a moment's typing, as an answer to the question `id`. */
  const waitingFor = useCallback((id: number) => {
    setPending(true);
    setTimeout(() => {
      setLines((now) => [
        ...now.map((line) => (line.id === id ? { ...line, waited: true } : line)),
        { id: nextId++, role: 'assistant' as const, content: WAITING, waited: true },
      ]);
      setPending(false);
      AccessibilityInfo.announceForAccessibility(`GymPal: ${WAITING}`);
    }, 700);
  }, []);

  // Asked each time it opens until it's known to be on: a key set since, or the server back.
  useEffect(() => {
    if (open && state !== 'on') void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ask = useCallback(
    async (conversation: Line[], about: Topic | null, withLog: boolean) => {
      setPending(true);
      setProblem(null);
      try {
        const sent = conversation.filter((line) => !line.waited).slice(-KEEP[pro ? 'pro' : 'free']);
        const { reply } = await api.askGymPal(
          sent.map(({ role, content }) => ({ role, content })),
          { context: about?.text ?? null, useLog: withLog },
        );
        setLines((now) => [...now, { id: nextId++, role: 'assistant', content: reply }]);
        setPending(false);
        AccessibilityInfo.announceForAccessibility(`GymPal: ${plain(reply)}`);
      } catch (error) {
        // The key was taken away since: back to waiting.
        if (error instanceof ApiError && error.code === 'gympal_off') {
          setState('off');
          waitingFor(conversation.at(-1)!.id);
          return;
        }
        setPending(false);
        haptic.warn();
        if (error instanceof ApiError && error.code === 'pro_required') setUseLog(false);
        setProblem(
          error instanceof ApiError && error.status === 401
            ? { text: 'Sign in to chat with GymPal.' }
            : { text: problemText(error, 'GymPal couldn’t answer. Try again?'), toPro: error instanceof ApiError && (error.code === 'gympal_limit' || error.code === 'pro_required') },
        );
      }
    },
    [pro, waitingFor],
  );

  /** Asks `text`, with what a screen told GymPal (this question's, or the conversation's). */
  const submit = useCallback(
    async (text: string, about: Topic | null = topic, withLog?: boolean) => {
      const question = text.trim().slice(0, MAX_QUESTION);
      if (!question || pending) return;
      haptic.tap();
      const asked: Line = { id: nextId++, role: 'user', content: question, ...(about ? { about: about.label } : {}) };
      const next = [...lines, asked];
      setLines(next);
      setDraft('');
      setProblem(null);
      // Not known to be on yet: ask again first, so a key put in since works straight away.
      setPending(true);
      const now = state === 'on' ? 'on' : await check();
      if (now === 'off') waitingFor(asked.id);
      else void ask(next, about, (withLog ?? useLog) && pro);
    },
    [ask, check, lines, pending, pro, state, topic, useLog, waitingFor],
  );

  // A screen opening the chat: with what it shows, and a question to ask at once.
  const latest = useRef(submit);
  latest.current = submit;
  useEffect(
    () =>
      onGymPalRequest((request) => {
        setOpen(true);
        const about = request.context ? { label: request.about ?? 'this screen', text: request.context } : null;
        if (about) setTopic(about);
        // A screen asking about their training (with Pro): the log switch goes on for this question and after.
        if (request.withLog) setUseLog(true);
        if (request.question) void latest.current(request.question, about ?? undefined, request.withLog);
      }),
    [],
  );

  // A browser: Ctrl+/ (⌘/ on a Mac) opens and closes him from anywhere, a text box included.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || (event.key !== '/' && event.code !== 'Slash')) return;
      event.preventDefault();
      setOpen((now) => !now);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startOver = () => {
    haptic.select();
    setLines([]);
    setProblem(null);
    setDraft('');
    setTopic(null);
  };

  const close = () => setOpen(false);
  const hidden = HIDDEN.has(pathname) || pathname.startsWith('/card/');

  // On a tab, above the tab bar; or, where the screen's wide enough, beside it.
  const besideBar = width >= TAB_BAR_MAX + 2 * (BUTTON + 2 * EDGE);
  // With the sidebar: beside the Menu button on a phone (it's narrow, in the middle); clear of the docked sidebar.
  const bottom = !TABS.has(pathname)
    ? insets.bottom + EDGE
    : mode === 'drawer'
      ? tabBarBottom(insets.bottom) + (MENU_BUTTON - BUTTON) / 2
      : mode === 'docked'
        ? insets.bottom + EDGE
        : tabBarBottom(insets.bottom) + (besideBar ? (TAB_BAR - BUTTON) / 2 : TAB_BAR + 12);
  // The screen's edge on that side (beside a docked sidebar on the left), and the corner button's place in from it.
  const flush = side === 'left' ? insets.left + (mode === 'docked' && TABS.has(pathname) ? SIDEBAR_WIDTH : 0) : insets.right;
  const show = () => setOpen(true);

  return (
    <>
      {!open && !hidden && button === 'corner' && <Launcher bottom={bottom} side={side} edge={flush + EDGE} onPress={show} />}
      {!open && !hidden && button === 'tab' && <EdgeTab bottom={bottom + (BUTTON - TAB.tall) / 2} side={side} edge={flush} onOpen={show} />}
      {/* Hidden: only the swipe, on a touch screen; a browser has its keys. */}
      {!open && !hidden && button === 'hidden' && Platform.OS !== 'web' && <EdgeStrip bottom={bottom - 40} side={side} edge={flush} onOpen={show} />}
      <Modal visible={open} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <Chat
          wide={width >= PANEL_FROM}
          lines={lines}
          draft={draft}
          setDraft={setDraft}
          pending={pending}
          problem={problem}
          state={state}
          topic={topic}
          suggestions={suggestionsFor(pathname, useLog && pro)}
          // Pro's switch, where there's Pro to have: not on the website.
          log={LIMITED || state !== 'on' ? null : { pro, on: useLog && pro, set: setUseLog }}
          onSend={() => void submit(draft)}
          onSuggest={(question) => void submit(question)}
          onRetry={() => {
            if (state !== 'on') void check();
            else {
              const last = lines.at(-1);
              void ask(lines, last?.about && topic ? topic : null, useLog && pro);
            }
          }}
          onForget={() => setTopic(null)}
          onStartOver={startOver}
          onPro={() => {
            close();
            openPro('gympal');
          }}
          onClose={close}
        />
      </Modal>
    </>
  );
}

/**
 * GymPal's logo, the dumbbell in its bubble lifting now and then: once,
 * soon after it appears, and each time `cheer` goes up (the chat opening,
 * each answer); `still` for one beside a screen's own text. Decoration:
 * what it stands for is in the label of the button or heading it's on.
 */
export function GymPalMark({ size, cheer = 0, still = false }: { size: number; cheer?: number; still?: boolean }) {
  const calm = useReducedMotion() || still;
  const lift = useSharedValue(0);

  useEffect(() => {
    if (calm) return;
    const rep = () => withSequence(withTiming(1, { duration: 240 }), withDelay(110, withTiming(0, { duration: 300 })));
    // One lift to say hello, then still: nothing at the edge of your eye keeps moving.
    lift.value = cheer === 0 ? withDelay(1400, rep()) : withSequence(rep(), rep());
    return () => cancelAnimation(lift);
  }, [calm, cheer, lift]);

  const dumbbell = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * size * 0.07 }, { rotate: `${-lift.value * 6}deg` }] }));
  const box = { width: size, height: size };
  return (
    <View style={box} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={GYMPAL_BODY} width={size} height={size} />
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: DUMBBELL_AT }, dumbbell]}>
        <SvgXml xml={GYMPAL_DUMBBELL} width={size} height={size} />
      </Animated.View>
    </View>
  );
}

/** The logo in the corner, as a button. */
function Launcher({ bottom, side, edge, onPress }: { bottom: number; side: 'right' | 'left'; edge: number; onPress: () => void }) {
  const press = usePressScale(0.9);
  return (
    <Animated.View entering={POP_IN} style={[styles.launcher, side === 'left' ? { bottom, left: edge } : { bottom, right: edge }]}>
      <Animated.View style={press.style}>
        <Pressable
          onPress={() => {
            haptic.tap();
            onPress();
          }}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          accessibilityRole="button"
          accessibilityLabel="Ask GymPal"
          accessibilityHint={Platform.OS === 'web' ? `Opens a chat with GymGO’s AI assistant. ${GYMPAL_KEYS} opens it too` : 'Opens a chat with GymGO’s AI assistant'}
          style={styles.launcherHit}
        >
          <GymPalMark size={BUTTON} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * A pull in from the screen's edge: how far (0 at rest, past 1 when it's
 * gone far enough), and `opened` once it has, on letting go or flicked.
 * Only inward counts; a press that hardly moves is left to a tap, and
 * `dragged` says when a drag ended, short or not, so the click a browser's
 * mouse sends after it isn't taken for one.
 */
function usePullIn(side: 'right' | 'left', opened: () => void, dragged: () => void = () => {}) {
  const pull = useSharedValue(0);
  const inward = side === 'right' ? -1 : 1;
  const gesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-24, 24])
    .onUpdate((event) => {
      pull.value = Math.max(0, (event.translationX * inward) / PULL_OPENS);
    })
    .onEnd((event) => {
      runOnJS(dragged)();
      if (event.translationX * inward >= PULL_OPENS || event.velocityX * inward > 600) runOnJS(opened)();
    })
    .onFinalize(() => {
      pull.value = withSpring(0, { damping: 18, stiffness: 260 });
    });
  return { pull, gesture, inward };
}

/** His tab on the screen's edge: tap it, or pull it in. */
function EdgeTab({ bottom, side, edge, onOpen }: { bottom: number; side: 'right' | 'left'; edge: number; onOpen: () => void }) {
  // A browser's mouse follows a drag with a click: that click mustn't open him a second time.
  const pulledAt = useRef(0);
  const dragged = useCallback(() => {
    pulledAt.current = Date.now();
  }, []);
  const opened = useCallback(() => {
    haptic.tap();
    onOpen();
  }, [onOpen]);
  const { pull, gesture, inward } = usePullIn(side, opened, dragged);
  // Follows the finger in a little, then holds: it's a handle, not a drawer.
  const follow = useAnimatedStyle(() => ({ transform: [{ translateX: inward * Math.min(pull.value, 1.4) * 14 }] }));
  const right = side === 'right';
  return (
    <Animated.View
      entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}
      style={[styles.edgeTab, right ? [styles.edgeTabRight, { right: edge }] : [styles.edgeTabLeft, { left: edge }], { bottom }, follow]}
    >
      <GestureDetector gesture={gesture}>
        <View style={styles.edgeTabInner}>
          <Pressable
            onPress={() => {
              if (Date.now() - pulledAt.current < 500) return;
              haptic.tap();
              onOpen();
            }}
            accessibilityRole="button"
            accessibilityLabel="Ask GymPal"
            accessibilityHint={Platform.OS === 'web' ? `Opens a chat with GymGO’s AI assistant. ${GYMPAL_KEYS} opens it too` : 'Opens a chat with GymGO’s AI assistant'}
            hitSlop={{ top: 6, bottom: 6, left: right ? 10 : 0, right: right ? 0 : 10 }}
            style={({ pressed }) => [styles.edgeTabHit, right ? styles.edgeTabHitRight : styles.edgeTabHitLeft, pressed && styles.pressed]}
          >
            <GymPalMark size={TAB.mark} />
          </Pressable>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

/**
 * Hidden: nothing to see, only a fingertip-wide strip on the edge, low
 * down, that a swipe in from the edge opens him from. Taps go through it
 * to nothing (it's in the screen's margin); a screen reader has Profile →
 * Ask GymPal and the Ask GymPal buttons instead.
 */
function EdgeStrip({ bottom, side, edge, onOpen }: { bottom: number; side: 'right' | 'left'; edge: number; onOpen: () => void }) {
  const opened = useCallback(() => {
    haptic.tap();
    onOpen();
  }, [onOpen]);
  const { gesture } = usePullIn(side, opened);
  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.strip, side === 'right' ? { right: edge } : { left: edge }, { bottom }]} accessible={false} importantForAccessibility="no-hide-descendants" />
    </GestureDetector>
  );
}

function Chat({
  wide,
  lines,
  draft,
  setDraft,
  pending,
  problem,
  state,
  topic,
  suggestions,
  log,
  onSend,
  onSuggest,
  onRetry,
  onForget,
  onStartOver,
  onPro,
  onClose,
}: {
  wide: boolean;
  lines: Line[];
  draft: string;
  setDraft: (text: string) => void;
  pending: boolean;
  problem: { text: string; toPro?: boolean } | null;
  state: State;
  topic: Topic | null;
  suggestions: string[];
  /** Pro's training-log switch: whether you have Pro, whether it's on, and how to change it; none where there's no Pro. */
  log: { pro: boolean; on: boolean; set: (on: boolean) => void } | null;
  onSend: () => void;
  onSuggest: (question: string) => void;
  onRetry: () => void;
  onForget: () => void;
  onStartOver: () => void;
  onPro: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const side = useThemeChoice().gymPalSide;
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const [focused, setFocused] = useState(false);
  const canSend = draft.trim().length > 0 && !pending;
  // A grin as it opens, and one with each answer.
  const answers = lines.filter((line) => line.role === 'assistant').length;

  // A browser: Enter sends, Shift+Enter starts a new line.
  const onKeyPress = (event: TextInputKeyPressEvent) => {
    const key = event.nativeEvent as TextInputKeyPressEvent['nativeEvent'] & { shiftKey?: boolean };
    if (Platform.OS !== 'web' || key.key !== 'Enter' || key.shiftKey) return;
    event.preventDefault();
    onSend();
  };

  const placed = wide
    ? [
        styles.panel,
        side === 'left' ? { left: insets.left + space[6] } : { right: insets.right + space[6] },
        { bottom: insets.bottom + space[6], height: Math.min(680, height - insets.top - insets.bottom - 2 * space[6]) },
      ]
    : [styles.sheet, { top: insets.top + space[3], paddingBottom: insets.bottom }];

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Tapping outside closes it, as any sheet; a screen reader closes it with Close. */}
      <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim, wide && styles.scrimLight]} onPress={onClose} accessible={false} importantForAccessibility="no" />
      </Animated.View>
      <Animated.View
        entering={FadeInDown.duration(260).reduceMotion(ReduceMotion.System)}
        style={placed}
        // The Modal is the dialog itself (in a browser, too); this keeps a screen reader inside it on iPhone.
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + space[3]}>
          <View style={styles.head}>
            <GymPalMark size={44} cheer={answers + 1} />
            <View style={styles.flex}>
              <Txt variant="headline" accessibilityRole="header">
                GymPal
              </Txt>
              <Txt variant="caption" color={color.labelSecondary}>
                {state === 'off' ? 'Being set up' : state === 'away' ? 'Can’t reach GymGO' : log?.pro ? 'Your personal assistant · Pro' : 'Your personal assistant'}
              </Txt>
            </View>
            {lines.length > 0 && (
              <Pressable onPress={onStartOver} accessibilityRole="button" style={styles.textButton} hitSlop={8}>
                <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                  Start over
                </Txt>
              </Pressable>
            )}
            <CloseButton onPress={onClose} />
          </View>

          {/* What GymPal was told, and the way to take it back. */}
          {topic && (
            <View style={styles.topic}>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.flex} numberOfLines={1}>
                About: <Txt variant="footnote" color={color.label} style={face('semibold')}>{topic.label}</Txt>
              </Txt>
              <Pressable onPress={onForget} accessibilityRole="button" accessibilityLabel={`Stop telling GymPal about ${topic.label}`} hitSlop={10} style={styles.forget}>
                <Icon name="close" size={11} color={color.labelSecondary} weight="bold" />
              </Pressable>
            </View>
          )}

          <ScrollView
            ref={scroll}
            style={styles.flex}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          >
            <Bubble line={{ id: 0, role: 'assistant', content: GREETING }} />
            {/* Somewhere to start, for this screen: one tap asks it. */}
            {lines.length === 0 && !pending && (
              <View style={styles.suggestions} accessibilityRole="list" aria-label="Questions to start with">
                {suggestions.map((question) => (
                  <Pressable
                    key={question}
                    onPress={() => onSuggest(question)}
                    accessibilityRole="button"
                    accessibilityHint="Asks GymPal this"
                    style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                  >
                    <Txt variant="subhead" color={color.brand} style={face('medium')}>
                      {question}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            )}
            {lines.map((line) => (
              <Bubble key={line.id} line={line} />
            ))}
            {pending && <Typing />}
            {!!problem && (
              <View style={styles.problem} aria-live="polite">
                <Txt variant="footnote" color={color.dangerInk} style={styles.flex}>
                  {problem.text}
                </Txt>
                {problem.toPro ? (
                  <Pressable onPress={onPro} accessibilityRole="button" style={styles.textButton} hitSlop={8}>
                    <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                      See Pro
                    </Txt>
                  </Pressable>
                ) : (
                  state !== 'off' && (
                    <Pressable onPress={onRetry} accessibilityRole="button" style={styles.textButton} hitSlop={8}>
                      <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                        Try again
                      </Txt>
                    </Pressable>
                  )
                )}
              </View>
            )}
          </ScrollView>

          {/* Pro: let GymPal see your training. Free: what Pro would add, a tap from the Pro screen. */}
          {log && (
            <View style={styles.log}>
              <View style={styles.flex}>
                <Txt variant="footnote" style={face('semibold')}>
                  Use my training log{log.pro ? '' : ' · Pro'}
                </Txt>
                <Txt variant="caption" color={color.labelSecondary}>
                  {log.pro
                    ? 'GymPal sees your latest workouts: exercises, sets and weights. Never your gyms or notes.'
                    : 'With Pro, GymPal can see your workouts and answer for you: what to train today, how you’re going.'}
                </Txt>
              </View>
              {log.pro ? (
                <Toggle value={log.on} onValueChange={(on) => log.set(on)} accessibilityLabel="Let GymPal see my training log" />
              ) : (
                <Pressable onPress={onPro} accessibilityRole="button" accessibilityLabel="See GymGO Pro" style={styles.proPill} hitSlop={6}>
                  <Icon name="lock" size={11} color={color.brand} />
                  <Txt variant="caption" color={color.brand} style={face('semibold')}>
                    Pro
                  </Txt>
                </Pressable>
              )}
            </View>
          )}

          <View style={[styles.composer, focused && styles.composerFocused]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onKeyPress={onKeyPress}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask GymPal anything"
              placeholderTextColor={color.labelTertiary}
              accessibilityLabel="Ask GymPal"
              multiline
              numberOfLines={1}
              maxLength={MAX_QUESTION}
              autoFocus={Platform.OS === 'web'}
              style={styles.input}
            />
            <Pressable
              onPress={onSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
              style={[styles.send, !canSend && styles.sendOff]}
            >
              {canSend && <BrandFill round={18} />}
              <Icon name="send" size={18} color={canSend ? color.onBrand : color.labelTertiary} weight="bold" />
            </Pressable>
          </View>
          <Txt variant="caption" color={color.labelTertiary} style={styles.small}>
            {/* OpenRouter only once something is sent there. */}
            {state === 'off'
              ? 'GymPal is AI and can be wrong; a gym’s own page has its facts. Not medical advice.'
              : 'GymPal is AI and can be wrong; a gym’s own page has its facts. Chats go to OpenRouter, an AI service, so leave out personal details. Not medical advice.'}
          </Txt>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

function Bubble({ line }: { line: Line }) {
  const mine = line.role === 'user';
  return (
    <View style={mine ? styles.mineWrap : undefined}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]} accessible accessibilityLabel={`${mine ? 'You' : 'GymPal'}: ${plain(line.content)}${line.about ? `, about ${line.about}` : ''}`}>
        {mine && <BrandFill round={radius.lg} />}
        <Txt variant="callout" color={mine ? color.onBrand : color.label}>
          {mine ? line.content : <Rich text={line.content} />}
        </Txt>
      </View>
      {!!line.about && (
        <Txt variant="caption" color={color.labelTertiary} style={styles.aboutLine} aria-hidden>
          {`about ${line.about}`}
        </Txt>
      )}
    </View>
  );
}

/** An answer's light formatting: **bold**, headings, and bullets. */
function Rich({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((raw, index) => {
        const heading = /^#{1,6}\s+/.test(raw);
        const line = raw.replace(/^#{1,6}\s+/, '').replace(/^\s*[-*]\s+/, '• ');
        return (
          <Txt key={index} variant="callout" color={color.label} style={heading ? face('semibold') : undefined}>
            {line.split(/(\*\*[^*]+\*\*)/g).map((part, at) =>
              part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
                <Txt key={at} variant="callout" color={color.label} style={face('semibold')}>
                  {part.slice(2, -2)}
                </Txt>
              ) : (
                part
              ),
            )}
            {index < lines.length - 1 ? '\n' : ''}
          </Txt>
        );
      })}
    </>
  );
}

/** What a screen reader says: the words, without the stars. */
const plain = (text: string) => text.replace(/\*\*/g, '').replace(/^#{1,6}\s+/gm, '');

/** Three dots while GymPal thinks; still ones with Reduce Motion. */
function Typing() {
  const calm = useReducedMotion();
  return (
    <View style={[styles.bubble, styles.theirs, styles.typing]} accessible accessibilityLabel="GymPal is typing">
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} calm={calm} />
      ))}
    </View>
  );
}

function Dot({ index, calm }: { index: number; calm: boolean }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    lift.value = withDelay(
      index * 160,
      withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 }), withTiming(0, { duration: 320 })), -1, false),
    );
    return () => cancelAnimation(lift);
  }, [calm, index, lift]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + lift.value * 0.65, transform: [{ translateY: -lift.value * 3 }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    // The logo's own corners (26 of its 100), so the shadow follows them.
    launcher: { position: 'absolute', width: BUTTON, height: BUTTON, borderRadius: BUTTON * 0.26, borderCurve: 'continuous', ...shadow.float },
    launcherHit: { width: BUTTON, height: BUTTON, borderRadius: BUTTON * 0.26, overflow: 'hidden' },
    // Flat against the edge, round on the side facing in; the glass of a plate, so it sits quietly on any screen.
    edgeTab: { position: 'absolute', width: TAB.wide, height: TAB.tall, ...shadow.plate },
    edgeTabRight: { borderTopLeftRadius: TAB.tall / 2, borderBottomLeftRadius: TAB.tall / 2 },
    edgeTabLeft: { borderTopRightRadius: TAB.tall / 2, borderBottomRightRadius: TAB.tall / 2 },
    edgeTabInner: { flex: 1 },
    edgeTabHit: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: color.plate,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.separator,
    },
    edgeTabHitRight: { alignItems: 'flex-end', paddingRight: 4, borderRightWidth: 0, borderTopLeftRadius: TAB.tall / 2, borderBottomLeftRadius: TAB.tall / 2 },
    edgeTabHitLeft: { alignItems: 'flex-start', paddingLeft: 4, borderLeftWidth: 0, borderTopRightRadius: TAB.tall / 2, borderBottomRightRadius: TAB.tall / 2 },
    strip: { position: 'absolute', width: STRIP, height: 140 },
    scrim: { backgroundColor: color.scrim },
    scrimLight: { opacity: 0.5 },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderCurve: 'continuous',
      backgroundColor: color.groupedBackground,
      overflow: 'hidden',
      ...shadow.card,
    },
    panel: {
      position: 'absolute',
      width: 400,
      borderRadius: radius.xl,
      borderCurve: 'continuous',
      backgroundColor: color.groupedBackground,
      overflow: 'hidden',
      ...shadow.card,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.separator,
      backgroundColor: color.background,
    },
    topic: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      backgroundColor: color.brandTint,
    },
    forget: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    textButton: { paddingVertical: space[1], paddingHorizontal: space[1] },
    messages: { padding: space[4], gap: space[2] },
    suggestions: { alignItems: 'flex-end', gap: space[2], marginTop: space[1] },
    suggestion: {
      maxWidth: '86%',
      paddingHorizontal: space[3] + 2,
      paddingVertical: space[2],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderColor: color.brandBorder,
      backgroundColor: color.background,
    },
    pressed: { opacity: 0.7 },
    bubble: { maxWidth: '86%', paddingHorizontal: space[3] + 2, paddingVertical: space[2] + 2, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
    mineWrap: { alignItems: 'flex-end' },
    mine: { backgroundColor: color.brandFill, borderBottomRightRadius: 6 },
    theirs: { alignSelf: 'flex-start', backgroundColor: color.card, borderBottomLeftRadius: 6, ...shadow.plate },
    aboutLine: { marginTop: 3, marginRight: space[1] },
    typing: { flexDirection: 'row', gap: 5, paddingVertical: space[3] + 2 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.labelSecondary },
    problem: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[1] },
    log: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      marginHorizontal: space[3],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.md,
      borderCurve: 'continuous',
      backgroundColor: color.card,
    },
    proPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space[2] + 2,
      paddingVertical: space[1] + 1,
      borderRadius: radius.pill,
      backgroundColor: color.brandTint,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space[2],
      marginHorizontal: space[3],
      marginTop: space[2],
      padding: space[1],
      paddingLeft: space[3],
      borderRadius: 22,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: color.card,
      ...shadow.plate,
    },
    // Focus shows on the whole field, the app's accent ring, rather than a box inside it.
    composerFocused: { borderColor: color.brand },
    input: {
      flex: 1,
      minHeight: 36,
      maxHeight: 120,
      paddingVertical: 8,
      color: color.label,
      fontSize: 16,
      lineHeight: 20,
      ...face('regular'),
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', resize: 'none' } as object) : {}),
    },
    send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: color.brandFill },
    sendOff: { backgroundColor: color.fill },
    small: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[3], textAlign: 'center' },
  }),
);
