/**
 * GymPal, GymGO's AI assistant: his face in the bottom-right corner of
 * every signed-in screen, which opens a chat. It always opens on GymPal's
 * greeting. The conversation stays while the app is open (Start over
 * clears it) and is never stored anywhere.
 *
 * His face is his logo, assets/gympal/gympal.svg: a kettlebell in a
 * sweatband on GymGO's blue-violet, in three layers (lib/gymPalArt.ts, from
 * scripts/gympal-logo.mjs). He blinks every few seconds, sometimes twice,
 * and grins as the chat opens and with each answer. Still with Reduce
 * Motion.
 *
 * Answers come from a free AI model through the GymGO server
 * (apps/server/src/gymPal.ts), which hands the model GymPal's guide to the
 * app and the rules about real gyms' facts. Until it can answer (the
 * website, with no server behind it, or a server without the owner's
 * OpenRouter key), each question gets GymPal's apology that it's still
 * being set up; once the key is in, the next question goes through.
 *
 * Kept out of the way where the corner is busy: a workout in progress (its
 * rest timer sits there), the welcome tour, and the screens that open as
 * sheets.
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
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { ApiError, OfflineError, api, apiBase, problemText, type ChatTurn } from '@/lib/api';
import { GYMPAL_BODY, GYMPAL_EYES, GYMPAL_MOUTH } from '@/lib/gymPalArt';
import { haptic } from '@/lib/haptics';
import { tabBarBottom } from '@/lib/layout';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';
import { Icon } from './Icon';
import { POP_IN, Pressable, usePressScale } from './motion';
import { CloseButton, Txt } from './ui';

export const GREETING = 'Hi! I’m GymPal your personal assistant, ask me anything!';

/** What the server takes: the latest 20 messages, each question under 1,000 characters. */
const KEEP = 20;
const MAX_QUESTION = 1000;
const BUTTON = 60;
const EDGE = 16;
/** The tab bar's height and widest (app/(tabs)/_layout.tsx). */
const TAB_BAR = 64;
const TAB_BAR_MAX = 400;
/** From this wide, the chat is a panel in the corner rather than a sheet. */
const PANEL_FROM = 640;

const TABS = new Set(['/', '/explore', '/saved', '/profile']);
/** Where the corner is someone else's. */
const HIDDEN = new Set(['/train', '/welcome', '/compare', '/plates', '/pro', '/country', '/sign-in', '/report-bug']);

/** Where his eyes and mouth are, as shares of the logo (assets/gympal/gympal.svg's 100-unit box): what they blink and grin about. */
const EYES_AT = '50% 58%';
const MOUTH_AT = '50% 69.5%';

/** A message; `waited` marks a question answered only with WAITING, and that answer, which are never sent on. */
type Line = ChatTurn & { id: number; waited?: boolean };
/** Whether GymPal can answer here: not asked yet, yes, not set up (no server, or no key on it), or the server can't be reached. */
type State = 'unknown' | 'on' | 'off' | 'away';

/** GymPal's answer while it isn't set up. */
export const WAITING = 'Sorry, we’re waiting for GymPal to be set up. Check back soon!';

let nextId = 1;

export function GymPal() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [state, setState] = useState<State>('unknown');

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
    async (conversation: Line[]) => {
      setPending(true);
      setProblem(null);
      try {
        const sent = conversation.filter((line) => !line.waited).slice(-KEEP);
        const { reply } = await api.askGymPal(sent.map(({ role, content }) => ({ role, content })));
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
        setProblem(error instanceof ApiError && error.status === 401 ? 'Sign in to chat with GymPal.' : problemText(error, 'GymPal couldn’t answer. Try again?'));
      }
    },
    [waitingFor],
  );

  const send = useCallback(async () => {
    const question = draft.trim();
    if (!question || pending) return;
    haptic.tap();
    const asked: Line = { id: nextId++, role: 'user', content: question };
    const next = [...lines, asked];
    setLines(next);
    setDraft('');
    setProblem(null);
    // Not known to be on yet: ask again first, so a key put in since works straight away.
    setPending(true);
    const now = state === 'on' ? 'on' : await check();
    if (now === 'off') waitingFor(asked.id);
    else void ask(next);
  }, [ask, check, draft, lines, pending, state, waitingFor]);

  const startOver = () => {
    haptic.select();
    setLines([]);
    setProblem(null);
    setDraft('');
  };

  if (HIDDEN.has(pathname) || pathname.startsWith('/card/')) return null;

  // On a tab, above the tab bar; or, where the screen's wide enough, beside it.
  const besideBar = width >= TAB_BAR_MAX + 2 * (BUTTON + 2 * EDGE);
  const bottom = TABS.has(pathname)
    ? tabBarBottom(insets.bottom) + (besideBar ? (TAB_BAR - BUTTON) / 2 : TAB_BAR + 12)
    : insets.bottom + EDGE;

  return (
    <>
      {!open && <Launcher bottom={bottom} right={insets.right + EDGE} onPress={() => setOpen(true)} />}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Chat
          wide={width >= PANEL_FROM}
          lines={lines}
          draft={draft}
          setDraft={setDraft}
          pending={pending}
          problem={problem}
          state={state}
          onSend={() => void send()}
          onRetry={() => (state === 'on' ? void ask(lines) : void check())}
          onStartOver={startOver}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

/**
 * GymPal's face, his logo: blinking now and then, sometimes twice, and
 * grinning each time `cheer` goes up. Decoration: what it stands for is in
 * the label of the button or heading it's on.
 */
function Face({ size, cheer = 0 }: { size: number; cheer?: number }) {
  const calm = useReducedMotion();
  const lid = useSharedValue(1);
  const smile = useSharedValue(0);

  useEffect(() => {
    if (calm) return;
    let timer: ReturnType<typeof setTimeout>;
    const blink = () => {
      const shut = withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 120 }));
      lid.value = Math.random() < 0.25 ? withSequence(shut, withDelay(90, shut)) : shut;
      timer = setTimeout(blink, 2600 + Math.random() * 3400);
    };
    timer = setTimeout(blink, 1200 + Math.random() * 1500);
    return () => {
      clearTimeout(timer);
      cancelAnimation(lid);
    };
  }, [calm, lid]);

  useEffect(() => {
    if (calm || cheer === 0) return;
    smile.value = withSequence(withTiming(1, { duration: 220 }), withDelay(600, withTiming(0, { duration: 420 })));
  }, [calm, cheer, smile]);

  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: lid.value }] }));
  const mouth = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + smile.value * 0.08 }, { scaleY: 1 + smile.value * 0.28 }] }));
  const box = { width: size, height: size };
  return (
    <View style={box} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={GYMPAL_BODY} width={size} height={size} />
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: MOUTH_AT }, mouth]}>
        <SvgXml xml={GYMPAL_MOUTH} width={size} height={size} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: EYES_AT }, eyes]}>
        <SvgXml xml={GYMPAL_EYES} width={size} height={size} />
      </Animated.View>
    </View>
  );
}

/** The face in the corner, as a button. */
function Launcher({ bottom, right, onPress }: { bottom: number; right: number; onPress: () => void }) {
  const press = usePressScale(0.9);
  return (
    <Animated.View entering={POP_IN} style={[styles.launcher, { bottom, right }]}>
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
          accessibilityHint="Opens a chat with GymGO’s AI assistant"
          style={styles.launcherHit}
        >
          <Face size={BUTTON} />
        </Pressable>
      </Animated.View>
    </Animated.View>
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
  onSend,
  onRetry,
  onStartOver,
  onClose,
}: {
  wide: boolean;
  lines: Line[];
  draft: string;
  setDraft: (text: string) => void;
  pending: boolean;
  problem: string | null;
  state: State;
  onSend: () => void;
  onRetry: () => void;
  onStartOver: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [focused, setFocused] = useState(false);
  const canSend = draft.trim().length > 0 && !pending;
  // A grin as it opens, and one with each answer.
  const answers = lines.filter((line) => line.role === 'assistant').length;

  // A browser: Enter sends, Shift+Enter starts a new line.
  const onKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const key = event.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (Platform.OS !== 'web' || key.key !== 'Enter' || key.shiftKey) return;
    event.preventDefault();
    onSend();
  };

  const placed = wide
    ? [styles.panel, { right: insets.right + space[6], bottom: insets.bottom + space[6], height: Math.min(640, height - insets.top - insets.bottom - 2 * space[6]) }]
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
            <Face size={44} cheer={answers + 1} />
            <View style={styles.flex}>
              <Txt variant="headline" accessibilityRole="header">
                GymPal
              </Txt>
              <Txt variant="caption" color={color.labelSecondary}>
                {state === 'off' ? 'Being set up' : state === 'away' ? 'Can’t reach GymGO' : 'Your personal assistant'}
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

          <ScrollView
            ref={scroll}
            style={styles.flex}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          >
            <Bubble line={{ id: 0, role: 'assistant', content: GREETING }} />
            {lines.map((line) => (
              <Bubble key={line.id} line={line} />
            ))}
            {pending && <Typing />}
            {!!problem && (
              <View style={styles.problem} aria-live="polite">
                <Txt variant="footnote" color={color.dangerInk} style={styles.flex}>
                  {problem}
                </Txt>
                {state !== 'off' && (
                  <Pressable onPress={onRetry} accessibilityRole="button" style={styles.textButton} hitSlop={8}>
                    <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                      Try again
                    </Txt>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>

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
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]} accessible accessibilityLabel={`${mine ? 'You' : 'GymPal'}: ${plain(line.content)}`}>
      {mine && <BrandFill round={radius.lg} />}
      <Txt variant="callout" color={mine ? color.onBrand : color.label}>
        {mine ? line.content : <Rich text={line.content} />}
      </Txt>
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
    launcher: { position: 'absolute', width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2, ...shadow.float },
    launcherHit: { width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2 },
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
    textButton: { paddingVertical: space[1], paddingHorizontal: space[1] },
    messages: { padding: space[4], gap: space[2] },
    bubble: { maxWidth: '86%', paddingHorizontal: space[3] + 2, paddingVertical: space[2] + 2, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
    mine: { alignSelf: 'flex-end', backgroundColor: color.brandFill, borderBottomRightRadius: 6 },
    theirs: { alignSelf: 'flex-start', backgroundColor: color.card, borderBottomLeftRadius: 6, ...shadow.plate },
    typing: { flexDirection: 'row', gap: 5, paddingVertical: space[3] + 2 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.labelSecondary },
    problem: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[1] },
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
