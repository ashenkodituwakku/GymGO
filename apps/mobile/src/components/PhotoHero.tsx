/**
 * A gym's photos, across the top of its card, as a gallery to swipe through
 * (with dots, "2 of 5", and buttons for a mouse or a keyboard).
 *
 * Members' photos come first: taken by a GymGO member, checked by a
 * moderator, and credited to them. Then the photos the gym's own website
 * shares, up to four (fetched by the GymGO server, only from a site that is
 * that gym's alone, so never another branch's, and never a chain's stock
 * picture), each credited to the site. Failing both, the page can pass a labelled fallback (Google's own
 * photos of the place, or Street View outside it); otherwise the card says
 * "No photo supplied" and invites the first one.
 *
 * A demo gym is invented, so there's nothing real to photograph: it shows the
 * illustration drawn for it instead, labelled as one.
 */

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Pressable } from './motion';
import { api, apiBase, ApiError, OfflineError, photoUrl, type GymPhoto } from '@/lib/api';
import { EMPTY } from '@/lib/copy';
import { ILLUSTRATION_CREDIT, demoPicture } from '@/lib/gymPicture';
import { haptic } from '@/lib/haptics';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { PrimaryButton, Txt } from './ui';
import { pickGymPhoto } from '@/lib/gymPhoto';
import { siteName } from '@/lib/siteName';

/** Whether each gym's website photo loaded this session: its size, or null for none. */
const sitePhotos = new Map<string, { width: number; height: number } | null>();

/** The photo the gym's own website shares, once it has loaded; null when there's none (or no server). */
export function useWebsitePhoto(gymId: string, wanted: boolean): string | null {
  const base = apiBase();
  const uri = wanted && base ? `${base}/api/gyms/${encodeURIComponent(gymId)}/photo` : null;
  const [ok, setOk] = useState(() => (uri ? Boolean(sitePhotos.get(gymId)) : false));
  useEffect(() => {
    if (!uri) return;
    if (sitePhotos.has(gymId)) {
      setOk(Boolean(sitePhotos.get(gymId)));
      return;
    }
    let live = true;
    Image.getSize(
      uri,
      (width, height) => {
        sitePhotos.set(gymId, { width, height });
        if (live) setOk(true);
      },
      () => {
        sitePhotos.set(gymId, null);
        if (live) setOk(false);
      },
    );
    return () => {
      live = false;
    };
  }, [uri, gymId]);
  return uri && ok ? uri : null;
}

/** How many photos each gym's own website gives, once asked this session. */
const siteCounts = new Map<string, number>();

/**
 * All the photos the gym's own website gives (up to four), once its cover
 * has loaded: the cover's address, then the rest. Just the cover while the
 * count is on its way, or if it can't be had.
 */
export function useWebsitePhotos(gymId: string, wanted: boolean): string[] {
  const cover = useWebsitePhoto(gymId, wanted);
  const [count, setCount] = useState(() => siteCounts.get(gymId) ?? 1);
  useEffect(() => {
    const base = apiBase();
    if (!cover || !base) return;
    const known = siteCounts.get(gymId);
    if (known !== undefined) {
      setCount(known);
      return;
    }
    let live = true;
    fetch(`${base}/api/gyms/${encodeURIComponent(gymId)}/site-photos`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { count?: unknown } | null) => {
        const found = typeof body?.count === 'number' && Number.isInteger(body.count) ? Math.max(1, Math.min(4, body.count)) : 1;
        siteCounts.set(gymId, found);
        if (live) setCount(found);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [cover, gymId]);
  if (!cover) return [];
  return Array.from({ length: count }, (_, n) => (n === 0 ? cover : `${cover}/${n}`));
}

/** One picture in the gallery: what it shows, and whose it is. */
interface Slide {
  key: string;
  uri: string;
  credit: string;
  icon: 'photo' | 'website';
  alt: string;
}

/**
 * The photos side by side, a page each: swiped on a phone, or stepped
 * through with the arrows (a mouse, a keyboard). Dots and "2 of 5" say
 * where you are; each photo keeps its own credit.
 */
function Gallery({ slides, width }: { slides: Slide[]; width: number }) {
  const scroller = useRef<ScrollView>(null);
  const [at, setAt] = useState(0);
  const count = slides.length;
  const show = (index: number) => {
    const next = Math.max(0, Math.min(count - 1, index));
    haptic.select();
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setAt(next);
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    if (index !== at && index >= 0 && index < count) setAt(index);
  };
  return (
    <View style={{ width }}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
        style={{ width }}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={{ width }}>
            <Image source={{ uri: slide.uri }} style={[styles.photo, { width }]} resizeMode="cover" accessibilityLabel={slide.alt} />
            <View style={styles.credit}>
              <Icon name={slide.icon} size={11} color={color.onBrand} />
              <Txt variant="caption" color={color.onBrand} numberOfLines={1}>
                {slide.credit}
              </Txt>
            </View>
          </View>
        ))}
      </ScrollView>
      {count > 1 && (
        <>
          <View style={styles.counter} accessible accessibilityLabel={`Photo ${at + 1} of ${count}`}>
            <Txt variant="caption" color={color.onBrand} style={face('semibold')}>
              {`${at + 1} of ${count}`}
            </Txt>
          </View>
          <View style={styles.dots} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {slides.map((slide, index) => (
              <View key={slide.key} style={[styles.dot, index === at && styles.dotOn]} />
            ))}
          </View>
          {at > 0 && (
            <Pressable onPress={() => show(at - 1)} accessibilityRole="button" accessibilityLabel="Previous photo" hitSlop={6} style={[styles.arrow, styles.arrowLeft]}>
              <Icon name="chevronBack" size={14} color={color.onBrand} />
            </Pressable>
          )}
          {at < count - 1 && (
            <Pressable onPress={() => show(at + 1)} accessibilityRole="button" accessibilityLabel="Next photo" hitSlop={6} style={[styles.arrow, styles.arrowRight]}>
              <Icon name="chevron" size={14} color={color.onBrand} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

/** "franksgymperth.com", for the credit. */
const hostOf = (website: string | null | undefined) => (website ? siteName(website) : null);

type Step = { kind: 'idle' } | { kind: 'confirm'; uri: string; data: string } | { kind: 'sending' } | { kind: 'done'; text: string };

export function PhotoHero({
  gymId,
  isDemo,
  account,
  onSignIn,
  width: panelWidth,
  fallback,
  website,
}: {
  /** The gym's website, to credit its photo to. */
  website?: string | null;
  /** Shown instead of "No photo supplied yet" when nobody has shared one (e.g. Street View). */
  fallback?: ReactNode;
  gymId: string;
  isDemo: boolean;
  account: AccountApi;
  onSignIn: () => void;
  /** The card's width, when it isn't the window's (desktop panels). */
  width?: number;
}) {
  const window = useWindowDimensions();
  const width = (panelWidth ?? window.width) - space[4] * 2;
  const [photos, setPhotos] = useState<GymPhoto[] | null>(null);
  // The server didn't answer: then we don't know whether anyone has shared a
  // photo, so the card mustn't say nobody has.
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const token = account.state === 'signed_in' ? account.token : null;
  // Signed in, even while the server is away: then there's nobody to ask to sign in.
  const signedIn = account.token !== null;

  const load = useCallback(() => {
    api
      .photos(gymId, token)
      .then((result) => {
        setFailed(false);
        setPhotos(result.photos);
        setWaiting(result.mine.filter((item) => item.status === 'pending').length);
      })
      .catch(() => {
        setFailed(true);
        setPhotos([]);
      });
  }, [gymId, token]);

  useEffect(() => {
    setStep({ kind: 'idle' });
    load();
  }, [load]);

  const pick = async () => {
    if (!token) return onSignIn();
    // Made a sensible size first (lib/gymPhoto.ts): a phone's full photo was often over the server's 4 MB.
    const photo = await pickGymPhoto().catch(() => null);
    if (!photo) return;
    haptic.select();
    setStep({ kind: 'confirm', uri: photo.uri, data: photo.data });
  };

  const send = async (data: string) => {
    if (!token) return;
    setStep({ kind: 'sending' });
    try {
      await api.uploadPhoto(token, gymId, data);
      haptic.success();
      setStep({ kind: 'done', text: 'Thanks! A moderator will check it, then it shows here with your name on it.' });
      load();
    } catch (error) {
      haptic.warn();
      setStep({
        kind: 'done',
        text:
          error instanceof OfflineError
            ? 'Can’t reach the GymGO server right now.'
            : error instanceof ApiError
              ? error.message
              : 'That didn’t work. Try another photo?',
      });
    }
  };

  const list = photos ?? [];
  // The gym's own photos after the members': asked for once the members' are in.
  const sitePhotoUris = useWebsitePhotos(gymId, !isDemo && photos !== null);
  const sitePhoto = sitePhotoUris[0] ?? null;
  const site = hostOf(website);
  const slides: Slide[] = [
    ...list.flatMap((photo): Slide[] => {
      const uri = photoUrl(photo.url);
      return uri ? [{ key: `member-${photo.id}`, uri, credit: photo.credit, icon: 'photo', alt: `Photo by ${photo.credit}` }] : [];
    }),
    ...sitePhotoUris.map(
      (uri, n): Slide => ({
        key: `site-${n}`,
        uri,
        credit: site ? `From ${site}` : 'From the gym’s website',
        icon: 'website',
        alt: `Photo ${n + 1} from the gym’s own website`,
      }),
    ),
  ];
  const illustration = demoPicture({ id: gymId, isDemoData: isDemo });

  if (step.kind === 'confirm') {
    return (
      <View style={styles.confirm}>
        <Image source={{ uri: step.uri }} style={[styles.preview, { width }]} resizeMode="cover" />
        <Txt variant="subhead">
          Did you take this photo, and are you happy for GymGO to show it with your name? We remove its location data first.
        </Txt>
        <View style={styles.row}>
          <View style={styles.flex}>
            <PrimaryButton label="Yes, share it" onPress={() => void send(step.data)} />
          </View>
          <View style={styles.flex}>
            <PrimaryButton label="Cancel" tone="quiet" onPress={() => setStep({ kind: 'idle' })} />
          </View>
        </View>
      </View>
    );
  }

  // With nothing to show, the "No photo supplied" line carries its own add button.
  const fallbackShown = list.length === 0 && !sitePhoto && !illustration && Boolean(fallback) && !isDemo && photos !== null;
  const emptyRow = list.length === 0 && !sitePhoto && !illustration && !fallbackShown;
  // The small button at the end of a "no photos" line: try the server again, or add the first.
  const addPill =
    !isDemo && step.kind !== 'sending' && failed ? (
      <Pressable
        onPress={load}
        accessibilityRole="button"
        accessibilityLabel="Try loading the photos again"
        hitSlop={8}
        style={({ pressed }) => [styles.addPill, pressed && { opacity: 0.7 }]}
      >
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          Try again
        </Txt>
      </Pressable>
    ) : !isDemo && step.kind !== 'sending' && !(signedIn && !token) ? (
      <Pressable
        onPress={() => void pick()}
        accessibilityRole="button"
        accessibilityLabel={token ? 'Add a photo' : 'Sign in to add a photo'}
        hitSlop={8}
        style={({ pressed }) => [styles.addPill, pressed && { opacity: 0.7 }]}
      >
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          {token ? 'Add one' : 'Sign in to add'}
        </Txt>
      </Pressable>
    ) : null;
  return (
    <View style={styles.wrap}>
      {slides.length > 0 ? (
        <Gallery slides={slides} width={width} />
      ) : illustration ? (
        <View style={{ width }}>
          <Image source={illustration.source} style={[styles.photo, { width }]} resizeMode="cover" accessibilityLabel={illustration.alt} />
          <View style={styles.credit}>
            <Icon name="palette" size={11} color={color.onBrand} />
            <Txt variant="caption" color={color.onBrand}>
              {ILLUSTRATION_CREDIT}
            </Txt>
          </View>
        </View>
      ) : fallbackShown ? (
        <View style={[styles.fallback, { width }]}>
          {fallback}
          <View style={styles.fallbackRow}>
            <Icon name="photo" size={16} color={color.labelTertiary} />
            <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
              {failed ? 'Members’ photos didn’t load: the GymGO server isn’t reachable.' : 'No member photos yet. Been here?'}
            </Txt>
            {addPill}
          </View>
        </View>
      ) : (
        // One slim row, so the gym's answer isn't pushed off the card by an empty frame.
        <View style={[styles.empty, { width }]}>
          <Icon name="photo" size={20} color={color.labelTertiary} />
          <View style={styles.flex}>
            <Txt variant="subhead" style={face('semibold')}>
              {failed ? 'Photos didn’t load' : EMPTY.photos}
            </Txt>
            <Txt variant="caption" color={color.labelSecondary}>
              {isDemo
                ? 'An invented demo gym: nothing to photograph.'
                : failed
                  ? 'The GymGO server isn’t reachable right now.'
                  : 'Been here? Yours could be the first.'}
            </Txt>
          </View>
          {addPill}
        </View>
      )}

      {/* Signed in but the server away: no add button, as a photo couldn't be sent anyway. */}
      {!emptyRow && !fallbackShown && !isDemo && step.kind !== 'sending' && (failed ? (
        <Pressable onPress={load} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
          <Txt variant="subhead" color={color.brand} style={face('semibold')}>
            Try loading photos again
          </Txt>
        </Pressable>
      ) : signedIn && !token ? null : (
        <Pressable onPress={() => void pick()} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
          <Txt variant="subhead" color={color.brand} style={face('semibold')}>
            {token ? '+ Add a photo' : '+ Sign in to add a photo'}
          </Txt>
        </Pressable>
      ))}
      {step.kind === 'sending' && (
        <Txt variant="footnote" color={color.labelSecondary}>
          Sending your photo…
        </Txt>
      )}
      {step.kind === 'done' && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {step.text}
        </Txt>
      )}
      {step.kind !== 'done' && waiting > 0 && (
        <Txt variant="footnote" color={color.maybeInk}>
          {waiting === 1 ? 'Your photo is' : `${waiting} of your photos are`} waiting for a moderator.
        </Txt>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { gap: space[2], alignItems: 'flex-start' },
  fallback: { gap: space[3] },
  fallbackRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[1] },
  photo: { height: 180, borderRadius: radius.xl, borderCurve: 'continuous' },
  credit: {
    position: 'absolute',
    left: space[3],
    bottom: space[3],
    maxWidth: '70%',
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: color.scrim,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.brandBorder,
    backgroundColor: color.brandWash,
  },
  // The gallery's place: "2 of 5" at the top right, dots under the middle, arrows at the sides.
  counter: { position: 'absolute', top: space[3], right: space[3], paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.scrim },
  dots: { position: 'absolute', bottom: space[3] + 4, right: space[3], flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  dotOn: { backgroundColor: '#FFFFFF', width: 14 },
  arrow: { position: 'absolute', top: 90 - 16, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.scrim },
  arrowLeft: { left: space[2] },
  arrowRight: { right: space[2] },
  addPill: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.brandTint },
  add: { paddingVertical: space[1] },
  confirm: { gap: space[3] },
  preview: { height: 200, borderRadius: radius.xl },
  row: { flexDirection: 'row', gap: space[2] },
  flex: { flex: 1 },
}));
