/**
 * A workout in the friends' feed: who, when, what it was, how long, how much
 * was lifted, how many sets and records; the first few exercises with their
 * best set; who liked it; and Like and Comment. Tapping it opens the whole
 * workout and its comments (app/feed/[id].tsx).
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from './Avatar';
import { ExerciseGlyph } from './ExerciseGlyph';
import { Icon } from './Icon';
import { PIcon } from './PIcon';
import { Pressable, Pressy } from './motion';
import { useGlassRedraw } from './Redrawn';
import { Txt } from './ui';
import type { FeedItem } from '@/lib/api';
import { bestSetLine, feedCardLabel, feedExerciseName, feedWhen, firstName, likedLine, recordsFor, timeLine, volumeLine } from '@/lib/feed';
import { workingSets } from '@/lib/training';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';

/** Exercises on a card; the rest are a tap away. */
const SHOWN = 3;

export const FeedCard = memo(function FeedCard({
  item,
  onOpen,
  onLike,
  onComment,
}: {
  item: FeedItem;
  onOpen: () => void;
  onLike: () => void;
  onComment: () => void;
}) {
  // Memoised, so the screen drawing again skips it: Liquid Glass changed on its own still reaches it.
  useGlassRedraw();
  const more = item.exercises.length - SHOWN;
  const liked = likedLine(item);
  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${feedCardLabel(item)}. Open the workout`} style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <FeedByline item={item} />
        <Txt variant="title2" style={styles.title}>
          {item.name}
        </Txt>
        <FeedStats item={item} />

        {/* The first few exercises: its picture, how many sets, the best one, any record. */}
        <View style={styles.exercises}>
          {item.exercises.slice(0, SHOWN).map((exercise, index) => {
            const sets = workingSets(exercise.sets).length;
            const best = bestSetLine(exercise.sets, item.unit);
            const records = recordsFor(item.records, exercise.exerciseId);
            return (
              <View key={`${exercise.exerciseId}-${index}`} style={styles.exercise}>
                <View style={styles.glyph}>
                  <ExerciseGlyph exerciseId={exercise.name ? 'custom' : exercise.exerciseId} size={34} ink={color.label} accent={color.brand} />
                </View>
                <View style={styles.flex}>
                  <Txt variant="subhead" numberOfLines={1}>
                    {feedExerciseName(exercise)}
                  </Txt>
                  <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                    {`${sets} set${sets === 1 ? '' : 's'}${best ? ` · ${best}` : ''}`}
                  </Txt>
                </View>
                {!!records && (
                  <View style={styles.record} accessible accessibilityLabel={records}>
                    <Icon name="trophy" size={13} color={color.maybeInk} />
                    <Txt variant="caption" color={color.maybeInk} style={face('semibold')} numberOfLines={1}>
                      {records.split(' · ')[0]}
                    </Txt>
                  </View>
                )}
              </View>
            );
          })}
          {more > 0 && (
            <Txt variant="footnote" color={color.labelSecondary} style={styles.more}>
              {`See ${more} more exercise${more === 1 ? '' : 's'}`}
            </Txt>
          )}
        </View>
      </Pressable>

      {/* Likes and comments. */}
      <View style={styles.foot}>
        {!!liked && (
          <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1} style={styles.likedLine}>
            {liked}
          </Txt>
        )}
        <View style={styles.actions}>
          <Pressy
            onPress={onLike}
            accessibilityRole="button"
            accessibilityState={{ selected: item.liked }}
            accessibilityLabel={item.liked ? 'Liked. Take your like back' : item.you ? 'Like your workout' : `Like ${firstName(item.person)}’s workout`}
            style={styles.action}
          >
            <PIcon name="heart" size={20} weight={item.liked ? 'fill' : 'regular'} color={item.liked ? color.danger : color.labelSecondary} />
            <Txt variant="subhead" color={item.liked ? color.dangerInk : color.labelSecondary} style={face('semibold')}>
              {item.likes > 0 ? String(item.likes) : 'Like'}
            </Txt>
          </Pressy>
          <Pressy onPress={onComment} accessibilityRole="button" accessibilityLabel={item.comments > 0 ? `${item.comments} comment${item.comments === 1 ? '' : 's'}. Read or add one` : 'Comment'} style={styles.action}>
            <PIcon name="chat-circle" size={20} weight="regular" color={color.labelSecondary} />
            <Txt variant="subhead" color={color.labelSecondary} style={face('semibold')}>
              {item.comments > 0 ? String(item.comments) : 'Comment'}
            </Txt>
          </Pressy>
        </View>
      </View>
    </View>
  );
});

/** Who and when (and, on your own, whether your friends can see it). */
export function FeedByline({ item, gym = true }: { item: FeedItem; /** The gym after the time (a page that shows it as a link of its own says false). */ gym?: boolean }) {
  return (
    <View style={styles.head}>
      <Avatar account={{ displayName: item.person.displayName, avatarUrl: item.person.avatarUrl }} size={40} variant="headline" person={item.you ? undefined : item.person.displayName} />
      <View style={styles.flex}>
        <Txt variant="subhead" numberOfLines={1} style={face('semibold')}>
          {item.you ? 'You' : item.person.displayName}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {feedWhen(item.finishedAt)}
          {gym && item.gym ? ` · ${item.gym.name}` : ''}
          {item.you && item.hidden ? ' · Hidden from friends' : ''}
        </Txt>
      </View>
    </View>
  );
}

/** The numbers, as a row of small facts: time, volume, sets, records. */
export function FeedStats({ item }: { item: FeedItem }) {
  return (
    <View style={styles.stats}>
      <Stat label="Time" value={timeLine(item)} />
      {item.volumeKg > 0 && <Stat label="Volume" value={volumeLine(item.volumeKg, item.unit)} />}
      <Stat label="Sets" value={String(item.sets)} />
      {item.records.length > 0 && <Stat label={item.records.length === 1 ? 'Record' : 'Records'} value={String(item.records.length)} icon />}
    </View>
  );
}

function Stat({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) {
  return (
    <View style={styles.stat} accessible={false}>
      <Txt variant="caption" color={color.labelSecondary}>
        {label}
      </Txt>
      <View style={styles.statValue}>
        {icon && <Icon name="trophy" size={14} color={color.maybeInk} />}
        <Txt variant="headline" numberOfLines={1}>
          {value}
        </Txt>
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { backgroundColor: color.plate, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', ...shadow.card },
    body: { padding: space[4], paddingBottom: space[3], gap: space[3] },
    pressed: { backgroundColor: color.pressed },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    title: { marginTop: -space[1] },
    stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[6], rowGap: space[2] },
    stat: { gap: 2 },
    statValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    exercises: { gap: space[2], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    exercise: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    glyph: { width: 44, height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill, alignItems: 'center', justifyContent: 'center' },
    record: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '40%', paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.maybeTint },
    more: { paddingLeft: 44 + space[3] },
    foot: { paddingHorizontal: space[4], paddingBottom: space[2], gap: space[1], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator, paddingTop: space[2] },
    likedLine: { paddingTop: 2 },
    actions: { flexDirection: 'row', gap: space[2], marginLeft: -space[2] },
    action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: space[2], borderRadius: radius.md },
  }),
);
