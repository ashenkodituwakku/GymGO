/**
 * Reviews for one gym, from the server: the published ones, your own that
 * are waiting for a moderator, and a form to write one.
 *
 * A summary card first (the average, how the stars fall from 5 to 1, and
 * the aspects people rated), then the reviews as cards, then the form. A
 * new review never appears straight away: someone checks it first, and the
 * app says so, rather than letting the writer think it's live.
 *
 * Reviews elsewhere (Google Maps, Apple Maps) are a link to that listing,
 * never copied in: they belong to their writers and to those services, and
 * GymGO's own reviews are never averaged with them.
 */

import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Pressable } from './motion';
import { starCounts, summariseAspects, summariseRatings, type GymRecord, type Review } from '@gymgo/domain';
import { api, ApiError, OfflineError } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { appleMapsSearchUrl, googleMapsSearchUrl } from '@/lib/present';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { PHOSPHOR } from './phosphor';
import { PrimaryButton, TextField, Txt } from './ui';
import { ReviewsSkeleton } from './Skeleton';

type Load = { state: 'loading' } | { state: 'offline' } | { state: 'ready'; reviews: Review[]; mine: Review[] };

type Aspect = 'equipment' | 'cleanliness' | 'atmosphere' | 'value';
const ASPECTS: Array<{ id: Aspect; label: string }> = [
  { id: 'equipment', label: 'Equipment' },
  { id: 'cleanliness', label: 'Cleanliness' },
  { id: 'atmosphere', label: 'Atmosphere' },
  { id: 'value', label: 'Value' },
];

/** What each number of stars means, said beside the stars as you pick. */
const STAR_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** Reviews shown before "Show all". */
const FIRST = 3;
/** A review longer than this opens with "Read more". */
const LONG = 280;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function ReviewsSection({
  gymId,
  record,
  account,
  inSheet,
  onSignIn,
}: {
  gymId: string;
  /** The gym, for the links to its listing on other maps (not for an invented demo gym). */
  record?: GymRecord;
  account: AccountApi;
  inSheet: boolean;
  onSignIn: () => void;
}) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [writing, setWriting] = useState(false);
  const [all, setAll] = useState(false);
  const token = account.state === 'signed_in' ? account.token : null;

  const refresh = useCallback(() => {
    api
      .reviews(gymId, token)
      .then((data) => setLoad({ state: 'ready', reviews: data.reviews, mine: data.mine }))
      .catch(() => setLoad({ state: 'offline' }));
  }, [gymId, token]);

  useEffect(() => {
    setLoad({ state: 'loading' });
    setWriting(false);
    setAll(false);
    refresh();
  }, [refresh]);

  const elsewhere = record && !record.location.isDemoData ? <Elsewhere record={record} /> : null;

  if (load.state === 'loading') return <ReviewsSkeleton />;
  if (load.state === 'offline') {
    return (
      <View style={styles.wrap}>
        <Txt variant="subhead" color={color.labelSecondary}>
          Reviews come from the GymGO server, which isn’t reachable right now.
        </Txt>
        {elsewhere}
      </View>
    );
  }

  const pending = load.mine.filter((review) => review.status === 'pending');
  const canWrite = token !== null && pending.length === 0;
  const shown = all ? load.reviews : load.reviews.slice(0, FIRST);

  const write =
    token === null ? (
      <PrimaryButton label="Sign in to write a review" tone="quiet" onPress={onSignIn} />
    ) : writing ? (
      <ReviewForm
        gymId={gymId}
        token={token}
        inSheet={inSheet}
        onDone={() => {
          setWriting(false);
          refresh();
        }}
        onCancel={() => setWriting(false)}
      />
    ) : canWrite ? (
      <PrimaryButton label="Write a review" tone="quiet" onPress={() => setWriting(true)} />
    ) : null;

  return (
    <View style={styles.wrap}>
      {load.reviews.length > 0 ? <Summary reviews={load.reviews} /> : <NoneYet />}

      {pending.map((review) => (
        <View key={review.id} style={styles.pending}>
          <View style={styles.pendingHead}>
            <Icon name="clock" size={14} color={color.maybeInk} />
            <Txt variant="footnote" color={color.maybeInk} style={face('semibold')}>
              Your review is waiting for a moderator
            </Txt>
          </View>
          <Stars value={review.overall} size={14} />
          <Txt variant="subhead">{review.body}</Txt>
        </View>
      ))}

      {shown.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {load.reviews.length > FIRST && (
        <PrimaryButton
          label={all ? 'Show fewer' : `Show all ${plural(load.reviews.length, 'review')}`}
          tone="quiet"
          onPress={() => setAll((open) => !open)}
        />
      )}

      {write}
      {elsewhere}
    </View>
  );
}

/**
 * A solid star: Phosphor's star (the light layer of its two-tone icon is the
 * star's own shape), drawn whole. In a browser the icon font's star is only
 * an outline, which made 3.8 of 5 hard to tell from 5 of 5.
 */
const STAR = PHOSPHOR.star.duotone[0]!.d;
function Star({ size, color: tint }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" aria-hidden>
      <Path d={STAR} fill={tint} />
    </Svg>
  );
}

/** A row of five stars, filled to `value`, read as one thing ("4 out of 5 stars"). */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={styles.starRow} accessible accessibilityRole="image" accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((at) => (
        <Star key={at} size={size} color={at <= Math.round(value) ? color.maybe : color.fillStrong} />
      ))}
    </View>
  );
}

/** The average, the stars under it, how many, and how the stars fall from 5 to 1; then the aspects people rated. */
function Summary({ reviews }: { reviews: Review[] }) {
  const summary = summariseRatings(reviews);
  const counts = starCounts(reviews);
  const most = Math.max(1, ...counts.map((row) => row.count));
  const aspects = summariseAspects(reviews);
  const rated = ASPECTS.filter(({ id }) => aspects[id].average !== null);
  return (
    <View style={styles.card}>
      <View style={styles.summaryTop}>
        <View style={styles.score}>
          <Txt variant="largeTitle">{summary.average?.toFixed(1)}</Txt>
          <Stars value={summary.average ?? 0} size={15} />
          <Txt variant="footnote" color={color.labelSecondary}>
            {plural(summary.count, 'review')}
          </Txt>
        </View>
        <View style={styles.bars} accessible accessibilityRole="image" accessibilityLabel={counts.map((row) => `${plural(row.stars, 'star')}: ${row.count}`).join(', ')}>
          {counts.map((row) => (
            <View key={row.stars} style={styles.barRow}>
              <Txt variant="caption" color={color.labelSecondary} style={styles.barLabel}>
                {row.stars}
              </Txt>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(row.count / most) * 100}%` }]} />
              </View>
              <Txt variant="caption" color={color.labelSecondary} style={styles.barCount}>
                {row.count}
              </Txt>
            </View>
          ))}
        </View>
      </View>
      {rated.length > 0 && (
        <View style={styles.aspects}>
          {rated.map(({ id, label }) => (
            <View key={id} style={styles.aspect}>
              <Txt variant="caption" color={color.labelSecondary}>
                {label}
              </Txt>
              <View style={styles.aspectScore}>
                <Star size={12} color={color.maybe} />
                <Txt variant="footnote" style={face('semibold')}>
                  {aspects[id].average?.toFixed(1)}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      )}
      <Txt variant="caption" color={color.labelSecondary}>
        From GymGO members. Visits aren’t verified, and a moderator reads every review before it appears.
      </Txt>
    </View>
  );
}

/** No reviews yet: said as an absence, never as a score of zero. */
function NoneYet() {
  return (
    <View style={[styles.card, styles.none]}>
      <View style={styles.noneIcon}>
        <Star size={20} color={color.labelSecondaryOnFill} />
      </View>
      <View style={styles.flex}>
        <Txt variant="headline">No reviews yet</Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          Trained here? Say what it’s like for the next person.
        </Txt>
      </View>
    </View>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const month = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

function ReviewCard({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const long = review.body.length > LONG;
  const aspects = ASPECTS.filter(({ id }) => review[id] !== null);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.initials} aria-hidden>
          <Txt variant="footnote" style={face('semibold')}>
            {initials(review.authorDisplayName)}
          </Txt>
        </View>
        <View style={styles.flex}>
          <Txt variant="subhead" style={face('semibold')} numberOfLines={1}>
            {review.authorDisplayName}
          </Txt>
          <Txt variant="caption" color={color.labelSecondary}>
            {day(review.createdAt)}
            {review.visitedOn ? ` · visited ${month(review.visitedOn)}` : ''}
          </Txt>
        </View>
        <Stars value={review.overall} size={14} />
      </View>
      <Txt variant="subhead" numberOfLines={long && !open ? 6 : undefined}>
        {review.body}
      </Txt>
      {long && (
        <Pressable onPress={() => setOpen((was) => !was)} accessibilityRole="button" aria-expanded={open} hitSlop={8} style={styles.more}>
          <Txt variant="footnote" color={color.brand} style={face('semibold')}>
            {open ? 'Show less' : 'Read more'}
          </Txt>
        </Pressable>
      )}
      {aspects.length > 0 && (
        <View style={styles.chips}>
          {aspects.map(({ id, label }) => (
            <View key={id} style={styles.chip}>
              <Txt variant="caption" color={color.labelSecondary}>
                {label}
              </Txt>
              <Star size={11} color={color.maybe} />
              <Txt variant="caption" style={face('semibold')}>
                {review[id]}
              </Txt>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Five stars to pick from: tap one to rate, or (for an optional one) tap the same again to clear it. */
function StarPicker({
  label,
  value,
  onChange,
  size,
  clearable,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  size: number;
  clearable: boolean;
}) {
  return (
    <View style={styles.starRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {[1, 2, 3, 4, 5].map((stars) => (
        <Pressable
          key={stars}
          onPress={() => {
            haptic.select();
            onChange(clearable && stars === value ? 0 : stars);
          }}
          accessibilityRole="radio"
          aria-checked={stars === value}
          accessibilityLabel={`${label}: ${plural(stars, 'star')}, ${STAR_WORDS[stars]}`}
          hitSlop={4}
          style={styles.pick}
        >
          <Star size={size} color={stars <= value ? color.maybe : color.fillStrong} />
        </Pressable>
      ))}
    </View>
  );
}

function ReviewForm({ gymId, token, inSheet, onDone, onCancel }: { gymId: string; token: string; inSheet: boolean; onDone: () => void; onCancel: () => void }) {
  const [stars, setStars] = useState(0);
  const [aspects, setAspects] = useState<Record<Aspect, number>>({ equipment: 0, cleanliness: 0, atmosphere: 0, value: 0 });
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What's still needed, said instead of a silently greyed-out button (the server asks the same).
  const written = body.trim().length;
  const missing =
    stars === 0
      ? 'Tap a star to rate it.'
      : written < 10
        ? `Say a little more: at least 10 characters${written ? ` (${10 - written} to go)` : ''}.`
        : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const rated = Object.fromEntries(ASPECTS.map(({ id }) => [id, aspects[id] || null]));
      await api.postReview(token, gymId, { overall: stars, body, ...rated });
      haptic.success();
      onDone();
    } catch (caught) {
      haptic.warn();
      setError(
        caught instanceof OfflineError
          ? 'Can’t reach the GymGO server right now.'
          : caught instanceof ApiError
            ? caught.message
            : 'Something went wrong.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, styles.form]}>
      <Txt variant="headline">Your review</Txt>
      <View style={styles.overall}>
        <StarPicker label="Rating" value={stars} onChange={setStars} size={32} clearable={false} />
        <Txt variant="subhead" color={stars ? color.label : color.labelSecondary} style={face('semibold')}>
          {stars ? STAR_WORDS[stars] : 'Tap to rate'}
        </Txt>
      </View>

      <View style={styles.details}>
        <Txt variant="footnote" color={color.labelSecondary}>
          The details, if you like (tap a star again to clear it)
        </Txt>
        {ASPECTS.map(({ id, label }) => (
          <View key={id} style={styles.detailRow}>
            <Txt variant="subhead" style={styles.flex}>
              {label}
            </Txt>
            <StarPicker label={label} value={aspects[id]} onChange={(next) => setAspects((was) => ({ ...was, [id]: next }))} size={22} clearable />
          </View>
        ))}
      </View>

      <TextField
        inSheet={inSheet}
        label="What was it like?"
        value={body}
        onChangeText={setBody}
        placeholder="The kit, the crowd, the staff, getting in as a visitor…"
        multiline
        maxLength={2000}
        style={styles.body}
      />
      {error && (
        <Txt variant="footnote" color={color.dangerInk}>
          {error}
        </Txt>
      )}
      <Txt variant="caption" color={color.labelSecondary}>
        {missing ?? 'A moderator reads every review before it appears.'}
      </Txt>
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <PrimaryButton label={busy ? 'Sending…' : 'Send review'} onPress={() => void submit()} disabled={busy || missing !== null} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Cancel" tone="quiet" onPress={onCancel} />
        </View>
      </View>
    </View>
  );
}

/** The gym's listing on Google Maps and Apple Maps, where their own reviews are: opened there, not copied here. */
function Elsewhere({ record }: { record: GymRecord }) {
  const open = (url: string) => {
    haptic.select();
    void Linking.openURL(url);
  };
  return (
    <View style={styles.elsewhere}>
      <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')}>
        Reviews on other maps
      </Txt>
      <View style={styles.links}>
        {[
          { label: 'Google Maps', url: googleMapsSearchUrl(record) },
          { label: 'Apple Maps', url: appleMapsSearchUrl(record) },
        ].map((link) => (
          <Pressable
            key={link.label}
            onPress={() => open(link.url)}
            accessibilityRole="link"
            accessibilityLabel={`Read ${record.location.name}'s reviews on ${link.label} (opens ${link.label})`}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Icon name="map" size={15} color={color.brandOnTint} />
            <Txt variant="footnote" color={color.brandOnTint} style={face('semibold')}>
              {link.label}
            </Txt>
            <Icon name="external" size={12} color={color.brandOnTint} />
          </Pressable>
        ))}
      </View>
      <Txt variant="caption" color={color.labelSecondary}>
        Opens their listing. Their reviews stay theirs: GymGO doesn’t copy them or add them to its own.
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { gap: space[3] },
    flex: { flex: 1 },
    card: { gap: space[2], padding: space[3] + 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.fill },
    summaryTop: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
    score: { alignItems: 'center', gap: 2, minWidth: 88 },
    bars: { flex: 1, gap: 3 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    barLabel: { width: 10, textAlign: 'right' },
    barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.fillStrong, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3, backgroundColor: color.maybe },
    barCount: { minWidth: 18, textAlign: 'right' },
    aspects: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    aspect: { flexGrow: 1, flexBasis: '40%', gap: 2, paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.card },
    aspectScore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    none: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    noneIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    pending: { gap: space[2], padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.maybeTint },
    pendingHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    initials: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    more: { alignSelf: 'flex-start' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] + 2 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.card },
    form: { gap: space[3] },
    overall: { flexDirection: 'row', alignItems: 'center', gap: space[3], flexWrap: 'wrap' },
    pick: { padding: 2 },
    details: { gap: space[2] },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    body: { height: 110, paddingTop: space[3], textAlignVertical: 'top' },
    buttons: { flexDirection: 'row', gap: space[2] },
    elsewhere: { gap: space[2], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.brandTint },
    pressed: { opacity: 0.7 },
  }),
);
