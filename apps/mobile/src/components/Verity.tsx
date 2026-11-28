/**
 * Verity, GymGO's AI assistant (called GymPal until 28 November 2026), a tap
 * away on every signed-in screen, which opens a chat. How it waits is yours
 * to choose in Appearance (lib/themePrefs.ts `verityButton`, `veritySide`),
 * and none of it covers what you're reading:
 *  - **Button** (the default): its logo in the bottom corner, big enough to
 *    find at a glance; on a wide screen, a pill that says "Ask Verity".
 *  - **Edge tab**: a tab flush with the screen's right (or left) edge, low
 *    down where a thumb reaches; tap it, or pull it in.
 *  - **Hidden**: nothing to see; on a phone, swipe in from that edge near
 *    the bottom (a strip a fingertip wide), or Profile → Ask Verity.
 * In a browser, Ctrl+/ (⌘/ on a Mac) opens and closes it from anywhere,
 * whichever you chose. It opens on Verity's greeting, what it can help
 * with, and two or three questions to start from that fit the screen
 * (lib/veritySuggestions.ts). The conversation stays while the app is open
 * (Start over clears it) and is never stored anywhere.
 *
 * Screens open it too (components/AskVerity.tsx, lib/verityBus.ts): "Ask
 * Verity about this plan" asks at once and tells it what the screen shows,
 * which the chat names under its heading ("About: this workout") until
 * Start over, another screen's, or its ✕.
 *
 * With GymGO Pro (and Max) the answers come from the paid AI service the
 * server names, it answers more questions a day and remembers more, the
 * chat has a switch to let it see your training log (a summary the server
 * makes of your latest sessions, never their gyms or notes), and Verity can
 * **build you a workout** right in the chat: ask, and it shows as a card to
 * check, then Start or Save (nothing is saved until you tap). Free gets the
 * free models, and the card's place says it's part of Pro.
 *
 * Under an answer, the screens it names in bold ("**Profile → Progress**")
 * become buttons to open them (lib/verityLinks.ts): only screens GymGO
 * knows, so an answer can never send anyone somewhere else.
 *
 * Every answer comes signed by the server and goes back with its signature,
 * so the server can tell Verity's own words from made-up ones
 * (apps/server/src/verityGuard.ts). A question the server's guard turns down
 * gets Verity's fixed refusal, shown with a small shield.
 *
 * Its logo, assets/verity/verity.svg: a speech bubble holding a dumbbell,
 * on a tile of GymGO's blue-violet, in two layers (lib/verityArt.ts, from
 * scripts/verity-logo.mjs). The dumbbell lifts once as its button appears,
 * and in the chat as it opens and with each answer; otherwise it keeps
 * still, so nothing in the corner of your eye moves. Still with Reduce
 * Motion.
 *
 * Until it can answer (the website, with no server behind it, or a server
 * without the owner's keys), each question gets Verity's apology that it's
 * still being set up; once a key is in, the next question goes through.
 *
 * Its button keeps out of the way where the corner is busy: a workout in
 * progress (its rest timer sits there), the welcome tour, and the screens
 * that open as sheets. The chat itself opens from any of them.
 */

import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
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
import { Backdrop } from './Backdrop';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { startSession } from '@/lib/activeSession';
import { ApiError, OfflineError, api, apiBase, problemText, type BuiltWorkout, type ChatTurn, type VerityAction } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { onVerityRequest } from '@/lib/verityBus';
import { useHomeEditing } from '@/lib/homeEditing';
import { VERITY_BODY, VERITY_DUMBBELL } from '@/lib/verityArt';
import { suggestionsFor } from '@/lib/veritySuggestions';
import { screenLinks } from '@/lib/verityLinks';
import { useDialogName } from '@/lib/dialogName';
import { haptic } from '@/lib/haptics';
import { tabBarBottom } from '@/lib/layout';
import { useThemeChoice } from '@/lib/themePrefs';
import { MENU_BUTTON, navMode, sidebarInset } from '@/lib/navLayout';
import { restLabel, unitFor } from '@/lib/training';
import { EXERCISES, exerciseById, exerciseName, ownExercises, setMeasure } from '@/lib/workout';
import { FOLD_SHIFT, useSidebarUnfolded } from './Sidebar';
import { LIMITED } from '@/lib/limited';
import { FIELD_FRAME, color, face, radius, shadow, space, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';
import { ExerciseTile } from './ExerciseGlyph';
import { Icon, type IconName } from './Icon';
import { ARRIVE_CURVE, POP_IN, Pressable, useCalm, usePressScale } from './motion';
import { Toggle } from './Toggle';
import { Txt, useAnnouncer } from './ui';

export const GREETING = 'Hi! I’m Verity your personal assistant, ask me anything!';

/** What the server takes: the latest 10 messages, or 30 with Pro, each question under 1,000 characters. */
const KEEP = { free: 10, pro: 30, max: 60 };
const MAX_QUESTION = 1000;
/** The corner button on a phone, the pill on a wide screen, and the tab on the edge. */
const BUTTON = 60;
const PILL = { tall: 56, wide: 176, mark: 40 };
const TAB = { wide: 42, tall: 64, mark: 32 };
/** How far a pull on the tab (or the hidden strip) must go to open it, and how wide the strip is. */
const PULL_OPENS = 28;
const STRIP = 14;
const EDGE = 16;
/** The tab bar's height and widest (app/(tabs)/_layout.tsx). */
const TAB_BAR = 64;
const TAB_BAR_MAX = 400;
/** From this wide, the chat is a panel in the corner rather than a sheet, and the button a pill. */
const PANEL_FROM = 640;

const TABS = new Set(['/', '/explore', '/saved', '/profile']);
/** Where the corner is someone else's: no button there, though screens there can still open the chat. */
const HIDDEN = new Set(['/train', '/welcome', '/welcome-back', '/compare', '/plates', '/pro', '/country', '/sign-in', '/report-bug']);

/** Where the dumbbell's middle is, as shares of the logo (assets/verity/verity.svg's 100-unit box): what it lifts about. */
const DUMBBELL_AT = '50% 48%';

/** The keys that open and close it in a browser. */
const ON_MAC = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
export const VERITY_KEYS = ON_MAC ? '⌘ /' : 'Ctrl + /';

/**
 * A message. `waited` marks a question answered only with WAITING, and that
 * answer, which are never sent on; `about` names what the screen told
 * Verity with the question, shown under it; `refused` marks the guard's
 * refusal; `action` is a workout Verity built, shown as a card.
 */
type Line = ChatTurn & { id: number; waited?: boolean; about?: string; refused?: boolean; action?: VerityAction };
/** Whether Verity can answer here: not asked yet, yes, not set up (no server, or no key on it), or the server can't be reached. */
type State = 'unknown' | 'on' | 'off' | 'away';
/** What a screen told Verity: its name for the person, and the lines sent. */
type Topic = { label: string; text: string };
/** A built workout's card: saving it, saved (and where), or neither yet. */
type Kept = { state: 'saving' | 'saved'; id: string | null };

/** Verity's answer while it isn't set up. */
export const WAITING = 'Sorry, we’re waiting for Verity to be set up. Check back soon!';

let nextId = 1;

export function Verity() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // How and on which side it waits, and the layout (Appearance).
  const { veritySide: side, verityButton: button, nav, foldOnMap } = useThemeChoice();
  const { width } = useWindowDimensions();
  const mode = navMode(nav, width, Platform.OS === 'web');
  const sidebarUnfolded = useSidebarUnfolded();
  const { account, billing, openPro, prefs } = useApp();
  const pro = billing.isPro;
  const max = billing.isMax;
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<{ text: string; toPro?: boolean } | null>(null);
  const [state, setState] = useState<State>('unknown');
  // Where chats go, as the server says (an older server doesn't: OpenRouter, as it was then).
  const [service, setService] = useState('OpenRouter');
  // Whether Verity can build workouts for you here (Pro or Max, and the server's paid service set up).
  const [actions, setActions] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [useLog, setUseLog] = useState(false);
  const [kept, setKept] = useState<Record<number, Kept>>({});
  // Its answers, read out by a screen reader as they arrive (on the web too, where React Native's own can't).
  const { say, region } = useAnnouncer();
  // Pro ended: the log stays home.
  useEffect(() => {
    if (!pro) setUseLog(false);
  }, [pro]);

  /** Whether Verity can answer now: the website with no server behind it can't, and a server says whether it has the keys. */
  const check = useCallback(async (): Promise<State> => {
    let next: State;
    if (!apiBase()) next = 'off';
    else {
      try {
        const status = await api.verity();
        next = status.on ? 'on' : 'off';
        if (status.service) setService(status.service);
        setActions(status.actions === true);
      } catch (error) {
        next = error instanceof OfflineError ? 'away' : 'off';
      }
    }
    setState(next);
    return next;
  }, []);

  /** Verity's apology for not being set up yet, after a moment's typing, as an answer to the question `id`. */
  const waitingFor = useCallback(
    (id: number) => {
      setPending(true);
      setTimeout(() => {
        setLines((now) => [
          ...now.map((line) => (line.id === id ? { ...line, waited: true } : line)),
          { id: nextId++, role: 'assistant' as const, content: WAITING, waited: true },
        ]);
        setPending(false);
        say(`Verity: ${WAITING}`);
      }, 700);
    },
    [say],
  );

  // Asked each time it opens until it's known to be on (a key set since, or the server back), and again when the plan changes.
  useEffect(() => {
    if (open && state !== 'on') void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (state === 'on') void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pro]);

  const ask = useCallback(
    async (conversation: Line[], about: Topic | null, withLog: boolean) => {
      setPending(true);
      setProblem(null);
      try {
        const sent = conversation.filter((line) => !line.waited).slice(-KEEP[max ? 'max' : pro ? 'pro' : 'free']);
        // GymGO's exercises and your own, for a workout Verity builds: only when it can.
        const exercises = actions ? [...EXERCISES, ...ownExercises()].map((exercise) => ({ id: exercise.id, name: exercise.name, measure: setMeasure(exercise.id) })) : null;
        const answer = await api.askVerity(
          sent.map(({ role, content, sig }) => ({ role, content, ...(sig ? { sig } : {}) })),
          { context: about?.text ?? null, useLog: withLog, exercises },
        );
        setLines((now) => [
          ...now,
          {
            id: nextId++,
            role: 'assistant',
            content: answer.reply,
            ...(answer.sig ? { sig: answer.sig } : {}),
            ...(answer.refused ? { refused: true } : {}),
            ...(answer.action?.type === 'workout' ? { action: answer.action } : {}),
          },
        ]);
        setPending(false);
        if (answer.action) haptic.success();
        say(`Verity: ${plain(answer.reply)}${answer.action ? `. Workout: ${answer.action.workout.name}, ${answer.action.workout.items.length} exercises` : ''}`);
      } catch (error) {
        // The key was taken away since: back to waiting.
        if (error instanceof ApiError && error.code === 'verity_off') {
          setState('off');
          waitingFor(conversation.at(-1)!.id);
          return;
        }
        setPending(false);
        haptic.warn();
        if (error instanceof ApiError && error.code === 'pro_required') setUseLog(false);
        setProblem(
          error instanceof ApiError && error.status === 401
            ? { text: 'Sign in to chat with Verity.' }
            : { text: problemText(error, 'Verity couldn’t answer. Try again.'), toPro: error instanceof ApiError && (error.code === 'verity_limit' || error.code === 'pro_required') },
        );
      }
    },
    [actions, max, pro, say, waitingFor],
  );

  /** Asks `text`, with what a screen told Verity (this question's, or the conversation's). */
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
      onVerityRequest((request) => {
        setOpen(true);
        const about = request.context ? { label: request.about ?? 'this screen', text: request.context } : null;
        if (about) setTopic(about);
        // A screen asking about their training (with Pro): the log switch goes on for this question and after.
        if (request.withLog) setUseLog(true);
        if (request.question) void latest.current(request.question, about ?? undefined, request.withLog);
      }),
    [],
  );

  // A browser: Ctrl+/ (⌘/ on a Mac) opens and closes it from anywhere, a text box included.
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

  // In a browser, focus goes back to what opened it (its button, a page's Ask Verity) when it closes.
  // The Modal tries, but it notes what had focus after the text box took it, and that box goes with it.
  const lastOutside = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function' || target.closest('[aria-modal="true"]')) return;
      lastOutside.current = target;
    };
    document.addEventListener('focusin', onIn);
    return () => document.removeEventListener('focusin', onIn);
  }, []);
  const wasOpen = useRef(open);
  useEffect(() => {
    const was = wasOpen.current;
    wasOpen.current = open;
    if (!was || open || Platform.OS !== 'web' || typeof requestAnimationFrame === 'undefined') return;
    const back = lastOutside.current;
    // Once the Modal has really gone: while it's leaving, its focus trap pulls focus back in (to Close).
    // Its own button is drawn again as it closes (a new one, so the old has gone): that one, then.
    let frames = 0;
    const settle = () => {
      if (document.querySelector('[aria-modal="true"]') && frames++ < 40) {
        requestAnimationFrame(settle);
        return;
      }
      const target = back?.isConnected ? back : (document.querySelector('[data-verity-launcher]') as HTMLElement | null);
      target?.focus({ preventScroll: true });
    };
    requestAnimationFrame(settle);
  }, [open]);

  const startOver = () => {
    haptic.select();
    setLines([]);
    setProblem(null);
    setDraft('');
    setTopic(null);
    setKept({});
  };

  const close = () => setOpen(false);

  /** A built workout, started now: the chat closes and the workout opens. */
  const startWorkout = (workout: BuiltWorkout) => {
    haptic.tap();
    startSession({ name: workout.name, workoutId: null, gymId: null, gymName: null, unit: unitFor(prefs.country), items: workout.items });
    close();
    router.push('/train');
  };

  /** A built workout, kept in My workouts (Pro, as keeping any is). */
  const saveWorkout = async (lineId: number, workout: BuiltWorkout) => {
    const token = account.token;
    if (!token || kept[lineId]) return;
    if (!pro) {
      close();
      openPro('workouts');
      return;
    }
    setKept((now) => ({ ...now, [lineId]: { state: 'saving', id: null } }));
    try {
      const muscles = [...new Set(workout.items.flatMap((item) => exerciseById(item.exerciseId)?.primary ?? []))].slice(0, 4);
      const { workout: saved } = await api.saveWorkout(token, {
        name: workout.name.slice(0, 80),
        gymId: null,
        plan: { muscles, goal: null, gymName: null, items: workout.items.map((item) => ({ ...item, uses: [], confirmed: false })), uncovered: [] },
      });
      haptic.success();
      setKept((now) => ({ ...now, [lineId]: { state: 'saved', id: saved.id } }));
      say(`${workout.name} saved to My workouts`);
    } catch (error) {
      setKept((now) => {
        const { [lineId]: _gone, ...rest } = now;
        return rest;
      });
      setProblem({ text: problemText(error, 'Couldn’t save it. Try again.') });
    }
  };

  /** A screen an answer named, opened: the chat closes so you can see it. */
  const openScreen = (href: string) => {
    haptic.tap();
    close();
    if (href === '/pro') openPro('verity');
    else router.push(href as never);
  };

  // Customising Home: its editing bar sits where the button does.
  const editingHome = useHomeEditing();
  const hidden = HIDDEN.has(pathname) || pathname.startsWith('/card/') || (editingHome && TABS.has(pathname));

  // A pill with words on a wide screen; the logo alone on a phone.
  const pill = width >= PANEL_FROM;
  const launcher = pill ? { wide: PILL.wide, tall: PILL.tall } : { wide: BUTTON, tall: BUTTON };
  // On a tab, above the tab bar; or, where the screen's wide enough, beside it.
  const besideBar = width >= TAB_BAR_MAX + 2 * (launcher.wide + 2 * EDGE);
  // With the sidebar: beside the Menu button on a phone (it's narrow, in the middle); clear of the docked sidebar.
  const bottom = !TABS.has(pathname)
    ? insets.bottom + EDGE
    : mode === 'drawer'
      ? tabBarBottom(insets.bottom) + (MENU_BUTTON - launcher.tall) / 2
      : mode === 'docked'
        ? insets.bottom + EDGE
        : tabBarBottom(insets.bottom) + (besideBar ? (TAB_BAR - launcher.tall) / 2 : TAB_BAR + 12);
  // The screen's edge on that side (beside a docked sidebar on the left), and the corner button's place in from it.
  // On the left: clear of the docked sidebar (its capsule on the map, or all of it once unfolded there).
  const flush = side === 'left' ? insets.left + sidebarInset(mode, pathname, true, foldOnMap) + (sidebarUnfolded ? FOLD_SHIFT : 0) : insets.right;
  const show = () => setOpen(true);

  return (
    <>
      {!open && !hidden && button === 'corner' && <Launcher pill={pill} bottom={bottom} side={side} edge={flush + EDGE} onPress={show} />}
      {!open && !hidden && button === 'tab' && <EdgeTab bottom={bottom + (launcher.tall - TAB.tall) / 2} side={side} edge={flush} onOpen={show} />}
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
          service={service}
          plan={max ? 'Max' : pro ? 'Pro' : null}
          actions={actions}
          topic={topic}
          kept={kept}
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
            openPro('verity');
          }}
          onStart={startWorkout}
          onSave={(lineId, workout) => void saveWorkout(lineId, workout)}
          onOpenSaved={(id) => {
            close();
            router.push(`/workouts/${encodeURIComponent(id)}` as never);
          }}
          onOpenScreen={openScreen}
          onClose={close}
          announcer={region}
        />
      </Modal>
    </>
  );
}

/** Marks its corner button and edge tab in a browser, so focus can find the new one after it closes. */
const LAUNCHER_MARK = { dataSet: { verityLauncher: '' } } as object;

/**
 * Verity’s logo, the dumbbell in its bubble lifting now and then: once,
 * soon after it appears, and each time `cheer` goes up (the chat opening,
 * each answer); `still` for one beside a screen's own text. Decoration:
 * what it stands for is in the label of the button or heading it's on.
 */
/**
 * The art's gradients, named for this one drawing. In a browser every mark is
 * in the same page, and each layer of each mark named its gradients
 * "verity-ground" and "verity-iron": the same ids over and over, which a page
 * mustn't have, and a mark's fill would find another mark's gradient (one in a
 * hidden page doesn't paint).
 */
function ownIds(xml: string, tag: string): string {
  return xml.replace(/verity-(ground|iron)/g, `verity-$1-${tag}`);
}

export function VerityMark({ size, cheer = 0, still = false }: { size: number; cheer?: number; still?: boolean }) {
  const calm = useCalm() || still;
  const lift = useSharedValue(0);
  const uid = useId().replace(/[^A-Za-z0-9]/g, '');
  const art = useMemo(() => ({ body: ownIds(VERITY_BODY, `${uid}b`), dumbbell: ownIds(VERITY_DUMBBELL, `${uid}d`) }), [uid]);

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
      <SvgXml xml={art.body} width={size} height={size} />
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: DUMBBELL_AT }, dumbbell]}>
        <SvgXml xml={art.dumbbell} width={size} height={size} />
      </Animated.View>
    </View>
  );
}

/** Its button in the corner: the logo on a phone, a pill that says "Ask Verity" on a wide screen. */
function Launcher({ pill, bottom, side, edge, onPress }: { pill: boolean; bottom: number; side: 'right' | 'left'; edge: number; onPress: () => void }) {
  const press = usePressScale();
  return (
    <Animated.View entering={POP_IN} style={[pill ? styles.pill : styles.launcher, side === 'left' ? { bottom, left: edge } : { bottom, right: edge }]}>
      <Animated.View style={press.style}>
        <Pressable
          onPress={() => {
            haptic.tap();
            onPress();
          }}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          accessibilityRole="button"
          accessibilityLabel="Ask Verity"
          {...LAUNCHER_MARK}
          accessibilityHint={Platform.OS === 'web' ? `Opens a chat with GymGO’s AI assistant. ${VERITY_KEYS} opens it too` : 'Opens a chat with GymGO’s AI assistant'}
          style={pill ? styles.pillHit : styles.launcherHit}
        >
          <VerityMark size={pill ? PILL.mark : BUTTON} />
          {pill && (
            <View style={styles.pillWords}>
              <Txt variant="subhead" style={face('semibold')} numberOfLines={1}>
                Ask Verity
              </Txt>
              <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
                {Platform.OS === 'web' ? VERITY_KEYS : 'AI assistant'}
              </Txt>
            </View>
          )}
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
  // How fast it was moving when let go, in the same units as `pull`, so the spring back starts at that speed.
  const thrown = useSharedValue(0);
  const inward = side === 'right' ? -1 : 1;
  const gesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-24, 24])
    .onBegin(() => {
      thrown.value = 0;
    })
    .onUpdate((event) => {
      pull.value = Math.max(0, (event.translationX * inward) / PULL_OPENS);
    })
    .onEnd((event) => {
      thrown.value = (event.velocityX * inward) / PULL_OPENS;
      runOnJS(dragged)();
      if (event.translationX * inward >= PULL_OPENS || event.velocityX * inward > 600) runOnJS(opened)();
    })
    .onFinalize(() => {
      pull.value = withSpring(0, { damping: 18, stiffness: 260, velocity: thrown.value });
    });
  return { pull, gesture, inward };
}

/** Its tab on the screen’s edge: tap it, or pull it in. */
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
      entering={FadeIn.duration(240).easing(ARRIVE_CURVE).reduceMotion(ReduceMotion.System)}
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
            accessibilityLabel="Ask Verity"
            {...LAUNCHER_MARK}
            accessibilityHint={Platform.OS === 'web' ? `Opens a chat with GymGO’s AI assistant. ${VERITY_KEYS} opens it too` : 'Opens a chat with GymGO’s AI assistant'}
            hitSlop={{ top: 6, bottom: 6, left: right ? 10 : 0, right: right ? 0 : 10 }}
            style={({ pressed }) => [styles.edgeTabHit, right ? styles.edgeTabHitRight : styles.edgeTabHitLeft, pressed && styles.pressed]}
          >
            <VerityMark size={TAB.mark} />
          </Pressable>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

/**
 * Hidden: nothing to see, only a fingertip-wide strip on the edge, low
 * down, that a swipe in from the edge opens it from. Taps go through it
 * to nothing (it's in the screen's margin); a screen reader has Profile →
 * Ask Verity and the Ask Verity buttons instead.
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

/** What Verity helps with, under its greeting: the last only with Pro or Max (and the paid service set up). */
const CAN_DO: Array<{ icon: IconName; text: string; paid?: boolean }> = [
  { icon: 'map', text: 'Finding gyms and getting around GymGO' },
  { icon: 'workout', text: 'Training questions, form and plans' },
  { icon: 'sparkle', text: 'Building you a workout, ready to start', paid: true },
];

function Chat({
  wide,
  lines,
  draft,
  setDraft,
  pending,
  problem,
  state,
  service,
  plan,
  actions,
  topic,
  kept,
  suggestions,
  log,
  onSend,
  onSuggest,
  onRetry,
  onForget,
  onStartOver,
  onPro,
  onStart,
  onSave,
  onOpenSaved,
  onOpenScreen,
  onClose,
  announcer,
}: {
  wide: boolean;
  lines: Line[];
  draft: string;
  setDraft: (text: string) => void;
  pending: boolean;
  problem: { text: string; toPro?: boolean } | null;
  state: State;
  /** The AI service chats go to, as the server says. */
  service: string;
  /** Your plan, for the heading: Pro, Max or none. */
  plan: 'Pro' | 'Max' | null;
  /** Whether Verity can build workouts for you here. */
  actions: boolean;
  topic: Topic | null;
  kept: Record<number, Kept>;
  suggestions: string[];
  /** Pro's training-log switch: whether you have Pro, whether it's on, and how to change it; none where there's no Pro. */
  log: { pro: boolean; on: boolean; set: (on: boolean) => void } | null;
  onSend: () => void;
  onSuggest: (question: string) => void;
  onRetry: () => void;
  onForget: () => void;
  onStartOver: () => void;
  onPro: () => void;
  onStart: (workout: BuiltWorkout) => void;
  onSave: (lineId: number, workout: BuiltWorkout) => void;
  onOpenSaved: (id: string) => void;
  onOpenScreen: (href: string) => void;
  onClose: () => void;
  /** Where its answers are read out from (useAnnouncer): inside the panel, which is all a screen reader hears while it's open. */
  announcer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const dialogName = useDialogName('Verity');
  const side = useThemeChoice().veritySide;
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const [focused, setFocused] = useState(false);
  const canSend = draft.trim().length > 0 && !pending;
  // A lift as it opens, and one with each answer.
  const answers = lines.filter((line) => line.role === 'assistant').length;
  const status = state === 'off' ? 'Being set up' : state === 'away' ? 'Can’t reach GymGO' : state === 'on' ? 'Online' : 'Connecting';

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
        { bottom: insets.bottom + space[6], height: Math.min(720, height - insets.top - insets.bottom - 2 * space[6]) },
      ]
    : [styles.sheet, { top: insets.top + space[3], paddingBottom: insets.bottom }];

  return (
    <View style={StyleSheet.absoluteFill} ref={dialogName}>
      {/* Tapping outside closes it, as any sheet; a screen reader closes it with Close. */}
      <Animated.View entering={FadeIn.duration(180).easing(ARRIVE_CURVE).reduceMotion(ReduceMotion.System)} style={StyleSheet.absoluteFill}>
        <Backdrop style={[StyleSheet.absoluteFill, styles.scrim, wide && styles.scrimLight]} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={FadeInDown.duration(260).easing(ARRIVE_CURVE).reduceMotion(ReduceMotion.System)}
        style={placed}
        // The Modal is the dialog itself (in a browser, too); this keeps a screen reader inside it on iPhone.
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + space[3]}>
          {/* The heading: on the accent, with its logo, whether it's answering, and your plan. */}
          <View style={styles.head}>
            <BrandFill />
            <View style={styles.headMark}>
              <VerityMark size={44} cheer={answers + 1} />
            </View>
            <View style={styles.flex}>
              <Txt variant="headline" color={color.onBrand} accessibilityRole="header">
                Verity
              </Txt>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, state === 'on' ? styles.dotOn : state === 'off' ? styles.dotWait : styles.dotAway]} />
                <Txt variant="caption" color={color.onBrand} style={styles.headSoft} numberOfLines={1}>
                  {plan ? `${status} · ${plan}` : status}
                </Txt>
              </View>
            </View>
            {lines.length > 0 && (
              <Pressable onPress={onStartOver} accessibilityRole="button" accessibilityLabel="Start over" hitSlop={8} style={({ pressed }) => [styles.headButton, pressed && styles.pressed]}>
                <Icon name="refresh" size={16} color={color.onBrand} weight="bold" />
              </Pressable>
            )}
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={({ pressed }) => [styles.headButton, pressed && styles.pressed]}>
              <Icon name="close" size={14} color={color.onBrand} weight="bold" />
            </Pressable>
          </View>

          {/* What Verity was told, and the way to take it back. */}
          {topic && (
            <View style={styles.topic}>
              <Icon name="eye" size={13} color={color.labelSecondaryOnTint} />
              <Txt variant="footnote" color={color.labelSecondaryOnTint} style={styles.flex} numberOfLines={1}>
                About: <Txt variant="footnote" color={color.label} style={face('semibold')}>{topic.label}</Txt>
              </Txt>
              <Pressable onPress={onForget} accessibilityRole="button" accessibilityLabel={`Stop telling Verity about ${topic.label}`} hitSlop={10} style={styles.forget}>
                <Icon name="close" size={11} color={color.labelSecondaryOnTint} weight="bold" />
              </Pressable>
            </View>
          )}

          <ScrollView
            ref={scroll}
            // In a browser, the conversation takes focus, so a keyboard can scroll it when nothing in it can.
            focusable={Platform.OS === 'web'}
            role="region"
            aria-label="Conversation with Verity"
            style={styles.flex}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          >
            {/* Its greeting and what it can do, at the top of every conversation. */}
            <View style={styles.welcome}>
              <VerityMark size={64} still />
              <Txt variant="title2" style={styles.welcomeText}>
                {GREETING}
              </Txt>
              {lines.length === 0 && (
                <View style={styles.canDo} role="group" aria-label="What Verity can help with">
                  {CAN_DO.map((item) => {
                    const locked = item.paid && !actions;
                    return (
                      <View key={item.text} style={styles.canDoRow}>
                        <View style={styles.canDoIcon}>
                          <Icon name={item.icon} size={15} color={color.brandOnTint} />
                        </View>
                        <Txt variant="subhead" style={styles.flex}>
                          {item.text}
                        </Txt>
                        {locked && (
                          <Pressable onPress={onPro} accessibilityRole="button" accessibilityLabel="Building workouts in the chat is part of GymGO Pro. See Pro" hitSlop={6} style={styles.proPill}>
                            <Icon name="lock" size={10} color={color.brandOnTint} />
                            <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
                              Pro
                            </Txt>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            {/* Somewhere to start, for this screen: one tap asks it. A named group, not a list: its
                buttons aren't list items, and a list of anything else is an error to a screen reader. */}
            {lines.length === 0 && !pending && (
              <View style={styles.suggestions} role="group" aria-label="Questions to start with">
                {suggestions.map((question) => (
                  <Pressable
                    key={question}
                    onPress={() => onSuggest(question)}
                    accessibilityRole="button"
                    accessibilityHint="Asks Verity this"
                    style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                  >
                    <Txt variant="subhead" color={color.brand} style={face('medium')}>
                      {question}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            )}
            {lines.map((line, index) => (
              <View key={line.id} style={styles.turn}>
                <Bubble line={line} first={index === 0 || lines[index - 1]!.role !== line.role} />
                {line.action?.type === 'workout' && (
                  <WorkoutCard workout={line.action.workout} kept={kept[line.id] ?? null} onStart={() => onStart(line.action!.workout)} onSave={() => onSave(line.id, line.action!.workout)} onOpenSaved={onOpenSaved} />
                )}
                {line.role === 'assistant' && !line.refused && !line.waited && !LIMITED && <Links answer={line.content} onOpen={onOpenScreen} />}
              </View>
            ))}
            {pending && <Typing />}
            {/* Always there, so a problem put in it is read out (a live region that arrives with its words often isn't). */}
            <View aria-live="polite">
              {!!problem && (
                <View style={styles.problem}>
                  <Icon name="warning" size={14} color={color.dangerInk} />
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
            </View>
            {announcer}
          </ScrollView>

          {/* Pro: let Verity see your training. Free: what Pro would add, a tap from the Pro screen. */}
          {log && (
            <View style={styles.log}>
              <Icon name="chart" size={16} color={log.on ? color.brand : color.labelSecondary} />
              <View style={styles.flex}>
                <Txt variant="footnote" style={face('semibold')}>
                  Use my training log{log.pro ? '' : ' · Pro'}
                </Txt>
                <Txt variant="caption" color={color.labelSecondary}>
                  {log.pro
                    ? 'Verity can see your recent exercises, sets and weights. It can’t see your gyms or notes.'
                    : 'With Pro, Verity can use your workouts to answer questions like what to train today.'}
                </Txt>
              </View>
              {log.pro ? (
                <Toggle value={log.on} onValueChange={(on) => log.set(on)} accessibilityLabel="Let Verity see my training log" />
              ) : (
                <Pressable onPress={onPro} accessibilityRole="button" accessibilityLabel="See GymGO Pro" style={styles.proPill} hitSlop={6}>
                  <Icon name="lock" size={11} color={color.brandOnTint} />
                  <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
                    Pro
                  </Txt>
                </Pressable>
              )}
            </View>
          )}

          <View {...FIELD_FRAME} style={[styles.composer, focused && styles.composerFocused]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onKeyPress={onKeyPress}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={actions ? 'Ask anything, or “make me a workout”' : 'Message Verity'}
              placeholderTextColor={color.labelSecondaryOnFill}
              accessibilityLabel="Message Verity"
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
              {canSend && <BrandFill round={20} />}
              <Icon name="send" size={18} color={canSend ? color.onBrand : color.labelTertiary} weight="bold" />
            </Pressable>
          </View>
          {/* What Verity is and where chats go: words to read, so secondary grey. */}
          <Txt variant="caption" color={color.labelSecondary} style={styles.small} acronyms>
            {/* The AI service named only once something is sent there. */}
            {state === 'off'
              ? 'Verity is AI and can be wrong; a gym’s own page has its facts. Not medical advice.'
              : `Verity is AI and can be wrong; a gym’s own page has its facts. Chats go to ${service}, ${service.includes(' or ') ? 'AI services' : 'an AI service'}, so leave out personal details. Not medical advice.`}
          </Txt>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

/** A message: yours on the right in the accent; Verity's on the left, its logo beside the first of a run; its refusal with a shield. */
function Bubble({ line, first }: { line: Line; first: boolean }) {
  const mine = line.role === 'user';
  if (mine) {
    return (
      <View style={styles.mineWrap}>
        <View style={[styles.bubble, styles.mine]} accessible accessibilityLabel={`You: ${line.content}${line.about ? `, about ${line.about}` : ''}`}>
          <BrandFill round={radius.lg} />
          <Txt variant="callout" color={color.onBrand}>
            {line.content}
          </Txt>
        </View>
        {!!line.about && (
          <Txt variant="caption" color={color.labelSecondary} style={styles.aboutLine} aria-hidden>
            {`about ${line.about}`}
          </Txt>
        )}
      </View>
    );
  }
  return (
    <View style={styles.theirsRow}>
      <View style={styles.avatar}>{first && <VerityMark size={26} still />}</View>
      <View style={[styles.bubble, styles.theirs, line.refused && styles.refused]} accessible accessibilityLabel={`Verity: ${plain(line.content)}`}>
        {line.refused ? (
          <View style={styles.refusedRow}>
            <Icon name="lock" size={13} color={color.labelSecondary} />
            <Txt variant="callout" color={color.labelSecondary} style={styles.flex}>
              {line.content}
            </Txt>
          </View>
        ) : (
          <Txt variant="callout" color={color.label}>
            <Rich text={line.content} />
          </Txt>
        )}
      </View>
    </View>
  );
}

/** A workout Verity built: what's in it, and Start or Save. Nothing is kept until you tap. */
function WorkoutCard({ workout, kept, onStart, onSave, onOpenSaved }: { workout: BuiltWorkout; kept: Kept | null; onStart: () => void; onSave: () => void; onOpenSaved: (id: string) => void }) {
  const minutes = Math.round(workout.items.reduce((sum, item) => sum + item.sets * (45 + item.restSeconds), 0) / 60);
  return (
    <Animated.View entering={FadeInDown.duration(240).easing(ARRIVE_CURVE).reduceMotion(ReduceMotion.System)} style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardBadge}>
          <Icon name="sparkle" size={12} color={color.brandOnTint} />
          <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
            Built by Verity
          </Txt>
        </View>
        <Txt variant="caption" color={color.labelSecondary}>
          {`${workout.items.length} exercise${workout.items.length === 1 ? '' : 's'} · about ${minutes} min`}
        </Txt>
      </View>
      <Txt variant="headline" accessibilityRole="header">
        {workout.name}
      </Txt>
      {!!workout.note && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {workout.note}
        </Txt>
      )}
      <View>
        {workout.items.map((item, index) => (
          <View key={`${item.exerciseId}-${index}`} style={[styles.cardItem, index > 0 && styles.cardItemLine]}>
            <ExerciseTile exerciseId={item.exerciseId} size={34} />
            <View style={styles.flex}>
              <Txt variant="subhead" style={face('semibold')} numberOfLines={2}>
                {exerciseName(item.exerciseId)}
              </Txt>
              <Txt variant="caption" color={color.labelSecondary}>
                {`${item.sets} × ${item.reps}${item.restSeconds ? ` · rest ${restLabel(item.restSeconds)}` : ''}`}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.cardButtons}>
        <Pressable onPress={onStart} accessibilityRole="button" accessibilityLabel={`Start ${workout.name}`} style={({ pressed }) => [styles.cardPrimary, pressed && styles.pressed]}>
          <BrandFill round={radius.md} />
          <Icon name="play" size={14} color={color.onBrand} />
          <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
            Start
          </Txt>
        </Pressable>
        {kept?.state === 'saved' && kept.id ? (
          <Pressable onPress={() => onOpenSaved(kept.id!)} accessibilityRole="button" accessibilityLabel={`Saved to My workouts. Open ${workout.name}`} style={({ pressed }) => [styles.cardSecondary, pressed && styles.pressed]}>
            <Icon name="check" size={14} color={color.goodInk} />
            <Txt variant="subhead" color={color.goodInk} style={face('semibold')}>
              Saved · Open
            </Txt>
          </Pressable>
        ) : (
          <Pressable
            onPress={onSave}
            disabled={kept?.state === 'saving'}
            accessibilityRole="button"
            accessibilityLabel={`Save ${workout.name} to My workouts`}
            accessibilityState={{ busy: kept?.state === 'saving' }}
            style={({ pressed }) => [styles.cardSecondary, pressed && styles.pressed]}
          >
            <Icon name="save" size={14} color={color.brandOnTint} />
            <Txt variant="subhead" color={color.brandOnTint} style={face('semibold')}>
              {kept?.state === 'saving' ? 'Saving…' : 'Save'}
            </Txt>
          </Pressable>
        )}
      </View>
      <Txt variant="caption" color={color.labelSecondary}>
        You can swap, add or remove exercises during the workout.
      </Txt>
    </Animated.View>
  );
}

/** The screens an answer names, as buttons to open them (lib/verityLinks.ts). */
function Links({ answer, onOpen }: { answer: string; onOpen: (href: string) => void }) {
  const links = useMemo(() => screenLinks(answer), [answer]);
  if (links.length === 0) return null;
  return (
    <View style={styles.links} role="group" aria-label="Screens in this answer">
      {links.map((link) => (
        <Pressable key={link.href} onPress={() => onOpen(link.href)} accessibilityRole="link" accessibilityLabel={`Open ${link.label}`} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <Txt variant="footnote" color={color.brandOnTint} style={face('semibold')}>
            {link.label}
          </Txt>
          <Icon name="chevron" size={11} color={color.brandOnTint} weight="bold" />
        </Pressable>
      ))}
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

/** Its logo and three dots while Verity thinks; still ones with Reduce Motion. */
function Typing() {
  const calm = useCalm();
  return (
    <View style={styles.theirsRow}>
      <View style={styles.avatar}>
        <VerityMark size={26} still />
      </View>
      <View style={[styles.bubble, styles.theirs, styles.typing]} accessible accessibilityLabel="Verity is thinking">
        {[0, 1, 2].map((index) => (
          <Dot key={index} index={index} calm={calm} />
        ))}
      </View>
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
    // A wide screen's: the logo and its name on a plate, round at the ends.
    pill: { position: 'absolute', height: PILL.tall, minWidth: PILL.wide, borderRadius: PILL.tall / 2, ...shadow.float },
    pillHit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2] + 2,
      height: PILL.tall,
      paddingLeft: (PILL.tall - PILL.mark) / 2,
      paddingRight: space[4] + 2,
      borderRadius: PILL.tall / 2,
      backgroundColor: color.plateSolid,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.separator,
    },
    pillWords: { gap: 0 },
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
    edgeTabHitRight: { alignItems: 'flex-end', paddingRight: 5, borderRightWidth: 0, borderTopLeftRadius: TAB.tall / 2, borderBottomLeftRadius: TAB.tall / 2 },
    edgeTabHitLeft: { alignItems: 'flex-start', paddingLeft: 5, borderLeftWidth: 0, borderTopRightRadius: TAB.tall / 2, borderBottomRightRadius: TAB.tall / 2 },
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
      width: 420,
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
      paddingVertical: space[3] + 2,
      overflow: 'hidden',
      backgroundColor: color.brandFill,
    },
    // The logo on a light ring, so its own blue tile stands off the accent.
    headMark: { padding: 2, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'rgba(255, 255, 255, 0.85)' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.9)' },
    dotOn: { backgroundColor: color.good },
    dotWait: { backgroundColor: color.maybe },
    dotAway: { backgroundColor: color.no },
    headSoft: { opacity: 0.92 },
    headButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' },
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
    messages: { padding: space[4], gap: space[3] },
    welcome: { alignItems: 'center', gap: space[3], paddingTop: space[2], paddingBottom: space[1] },
    welcomeText: { textAlign: 'center', maxWidth: 320 },
    canDo: { alignSelf: 'stretch', gap: 2, padding: space[1], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    canDoRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[3], paddingVertical: space[2] + 2 },
    canDoIcon: { width: 28, height: 28, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2] },
    suggestion: {
      maxWidth: '100%',
      paddingHorizontal: space[3] + 2,
      paddingVertical: space[2],
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: color.brandBorder,
      backgroundColor: color.background,
    },
    pressed: { opacity: 0.7 },
    turn: { gap: space[2] },
    bubble: { maxWidth: '86%', paddingHorizontal: space[3] + 2, paddingVertical: space[2] + 2, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
    mineWrap: { alignItems: 'flex-end' },
    mine: { backgroundColor: color.brandFill, borderBottomRightRadius: 6 },
    theirsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
    avatar: { width: 26, height: 26 },
    theirs: { flexShrink: 1, backgroundColor: color.card, borderBottomLeftRadius: 6, ...shadow.plate },
    refused: { backgroundColor: color.fill },
    refusedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
    aboutLine: { marginTop: 3, marginRight: space[1] },
    typing: { flexDirection: 'row', gap: 5, paddingVertical: space[3] + 2 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.labelSecondary },
    problem: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[1] },
    // A built workout: a card beside Verity's answer, in from its logo.
    card: {
      marginLeft: 26 + space[2],
      gap: space[2],
      padding: space[3] + 2,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderColor: color.brandBorder,
      backgroundColor: color.card,
      ...shadow.plate,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], flexWrap: 'wrap' },
    cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.brandTint },
    cardItem: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
    cardItemLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    cardButtons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
    cardPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      minHeight: 44,
      borderRadius: radius.md,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: color.brandFill,
    },
    cardSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      minHeight: 44,
      borderRadius: radius.md,
      borderCurve: 'continuous',
      backgroundColor: color.brandTint,
    },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginLeft: 26 + space[2] },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space[3],
      paddingVertical: space[1] + 3,
      borderRadius: radius.pill,
      backgroundColor: color.brandTint,
    },
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
      paddingLeft: space[3] + 2,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: color.card,
      ...shadow.plate,
    },
    // Focus shows on the whole field, the app's accent ring, rather than a box inside it.
    composerFocused: { borderColor: color.brand },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      paddingVertical: 10,
      color: color.label,
      fontSize: 16,
      lineHeight: 20,
      ...face('regular'),
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', resize: 'none' } as object) : {}),
    },
    send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: color.brandFill },
    sendOff: { backgroundColor: color.fill },
    small: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[3], textAlign: 'center' },
  }),
);
