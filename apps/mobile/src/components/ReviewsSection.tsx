/**
 * Reviews for one gym, from the server: the published ones, your own that
 * are waiting for a moderator, and a form to write one.
 *
 * A new review never appears straight away. Someone checks it first, and
 * the app says so, rather than letting the writer think it's live.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { summariseRatings, type Review } from '@gymgo/domain';
import { api, ApiError, OfflineError } from '@/lib/api';
import { EMPTY } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space, themed } from '@/lib/theme';
import { PrimaryButton, TextField, Txt } from './ui';

type Load = { state: 'loading' } | { state: 'offline' } | { state: 'ready'; reviews: Review[]; mine: Review[] };

export function ReviewsSection({
  gymId,
  account,
  inSheet,
  onSignIn,
}: {
  gymId: string;
  account: AccountApi;
  inSheet: boolean;
  onSignIn: () => void;
}) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [writing, setWriting] = useState(false);
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
    refresh();
  }, [refresh]);

  if (load.state === 'loading') {
    return (
      <Txt variant="subhead" color={color.labelSecondary}>
        Loading reviews…
      </Txt>
    );
  }
  if (load.state === 'offline') {
    return (
      <Txt variant="subhead" color={color.labelSecondary}>
        Reviews come from the GymGO server, which isn’t reachable right now.
      </Txt>
    );
  }

  const summary = summariseRatings(load.reviews);
  const pending = load.mine.filter((review) => review.status === 'pending');
  const canWrite = token !== null && pending.length === 0;

  return (
    <View style={styles.wrap}>
      <Txt variant="subhead" color={color.labelSecondary}>
        {summary.count === 0
          ? EMPTY.reviews
          : `★ ${summary.average?.toFixed(1)} from ${summary.count} review${summary.count === 1 ? '' : 's'}. Visits aren’t verified.`}
      </Txt>

      {load.reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}

      {pending.map((review) => (
        <View key={review.id} style={styles.pending}>
          <Txt variant="footnote" color={color.maybeInk} style={face('medium')}>
            Your review is waiting for a moderator
          </Txt>
          <Txt variant="subhead">{review.body}</Txt>
        </View>
      ))}

      {token === null ? (
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
        />
      ) : canWrite ? (
        <PrimaryButton label="Write a review" tone="quiet" onPress={() => setWriting(true)} />
      ) : null}
    </View>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <View style={styles.item}>
      <Txt variant="footnote" color={color.labelSecondary}>
        {'★'.repeat(review.overall)}
        {'☆'.repeat(5 - review.overall)} · {review.authorDisplayName} · {new Date(review.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </Txt>
      <Txt variant="subhead">{review.body}</Txt>
    </View>
  );
}

function ReviewForm({ gymId, token, inSheet, onDone }: { gymId: string; token: string; inSheet: boolean; onDone: () => void }) {
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.postReview(token, gymId, { overall: stars, body });
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
    <View style={styles.form}>
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => {
              haptic.select();
              setStars(value);
            }}
            accessibilityRole="radio"
            aria-checked={stars === value}
            accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
            hitSlop={6}
          >
            <Txt variant="title" color={value <= stars ? color.maybe : color.fillStrong}>
              ★
            </Txt>
          </Pressable>
        ))}
      </View>
      <TextField
        inSheet={inSheet}
        label="Your review"
        value={body}
        onChangeText={setBody}
        placeholder="What was it like to train there?"
        multiline
        maxLength={2000}
        style={styles.body}
      />
      {error && (
        <Txt variant="footnote" color={color.dangerInk}>
          {error}
        </Txt>
      )}
      <PrimaryButton label={busy ? 'Sending…' : 'Send for review'} onPress={() => void submit()} disabled={busy || stars === 0 || body.trim().length < 10} />
      <Txt variant="caption" color={color.labelSecondary}>
        A moderator reads every review before it appears.
      </Txt>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { gap: space[3] },
  item: { gap: 4, paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  pending: { gap: 4, padding: space[3], borderRadius: radius.md, backgroundColor: color.maybeTint },
  form: { gap: space[3] },
  stars: { flexDirection: 'row', gap: space[2] },
  body: { height: 110, paddingTop: space[3], textAlignVertical: 'top' },
}));
