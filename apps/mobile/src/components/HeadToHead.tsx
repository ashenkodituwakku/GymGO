/**
 * Head to head (Pro): your best lifts beside a friend's, on every exercise
 * you've both done, from your log and the workouts they share with you. The
 * one ahead on each is marked. Free accounts see what it is, and the way to
 * Pro.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Card, PrimaryButton, Txt } from './ui';
import { ApiError, api, problemText, type HeadToHead as Compared } from '@/lib/api';
import { ahead, bestLine, feedExerciseName } from '@/lib/feed';
import type { WeightUnit } from '@/lib/training';
import { color, face, radius, space, themed } from '@/lib/theme';

/** Exercises listed before "Show all". */
const FIRST = 6;

export function HeadToHead({ token, friendId, friendName, pro, unit }: { token: string; friendId: string; friendName: string; pro: boolean; unit: WeightUnit }) {
  const router = useRouter();
  const [compared, setCompared] = useState<Compared | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not-shared' | 'problem'>('loading');
  const [problem, setProblem] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const first = friendName.trim().split(/\s+/)[0] ?? friendName;

  useEffect(() => {
    if (!pro) return;
    let live = true;
    setState('loading');
    api
      .headToHead(token, friendId)
      .then((answer) => {
        if (!live) return;
        setCompared(answer);
        setState('ready');
      })
      .catch((error) => {
        if (!live) return;
        if (error instanceof ApiError && error.status === 404) setState('not-shared');
        else {
          setProblem(problemText(error));
          setState('problem');
        }
      });
    return () => {
      live = false;
    };
  }, [token, friendId, pro]);

  if (!pro) {
    return (
      <Card style={styles.card}>
        <View style={styles.titleRow}>
          <Icon name="compare" size={18} color={color.brand} />
          <Txt variant="headline">Head to head</Txt>
          <View style={styles.pro}>
            <Txt variant="caption" color={color.onBrand} style={face('bold')}>
              PRO
            </Txt>
          </View>
        </View>
        <Txt variant="subhead" color={color.labelSecondary}>
          {`Your best lifts beside ${first}’s, exercise by exercise: who’s heavier, whose set is stronger, who does more reps.`}
        </Txt>
        <PrimaryButton label="See GymGO Pro" tone="quiet" onPress={() => router.push({ pathname: '/pro', params: { reason: 'headToHead' } })} />
      </Card>
    );
  }

  const rows = compared?.rows ?? [];
  const shown = all ? rows : rows.slice(0, FIRST);
  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Icon name="compare" size={18} color={color.brand} />
        <Txt variant="headline">Head to head</Txt>
      </View>
      {state === 'loading' && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Comparing…
        </Txt>
      )}
      {state === 'not-shared' && (
        <Txt variant="subhead" color={color.labelSecondary}>
          {`${first} doesn’t share their workouts yet, so there’s nothing to compare. Once they do, their best lifts show here beside yours.`}
        </Txt>
      )}
      {state === 'problem' && (
        <Txt variant="subhead" color={color.noInk}>
          {problem}
        </Txt>
      )}
      {state === 'ready' && rows.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          {`You and ${first} haven’t done the same exercise yet. Do one of their workouts from the feed, and you will have.`}
        </Txt>
      )}
      {state === 'ready' && rows.length > 0 && (
        <>
          <View style={styles.headRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.flex} />
            <Txt variant="caption" color={color.labelSecondary} style={styles.side}>
              You
            </Txt>
            <Txt variant="caption" color={color.labelSecondary} style={styles.side} numberOfLines={1}>
              {first}
            </Txt>
          </View>
          {shown.map((row) => {
            const lead = ahead(row.you, row.them);
            const you = bestLine(row.you, unit);
            const them = bestLine(row.them, unit);
            const name = feedExerciseName(row);
            return (
              <View
                key={row.exerciseId}
                style={styles.row}
                accessible
                accessibilityLabel={`${name}: you ${you.main.replace(' ', ' ')}, ${first} ${them.main.replace(' ', ' ')}. ${lead === 'you' ? 'You’re ahead' : lead === 'them' ? `${first} is ahead` : 'Level'}`}
              >
                <Txt variant="subhead" numberOfLines={2} style={styles.flex}>
                  {name}
                </Txt>
                <Side line={you} lead={lead === 'you'} />
                <Side line={them} lead={lead === 'them'} />
              </View>
            );
          })}
          {rows.length > FIRST && !all && <PrimaryButton label={`Show all ${rows.length}`} tone="quiet" onPress={() => setAll(true)} />}
          <Txt variant="footnote" color={color.labelSecondary}>
            {`From your log and the workouts ${first} shares with you. 1-rep max is estimated from your best set.`}
          </Txt>
        </>
      )}
    </Card>
  );
}

function Side({ line, lead }: { line: { main: string; under: string | null }; lead: boolean }) {
  return (
    <View style={[styles.side, lead && styles.lead]}>
      <Txt variant="subhead" color={lead ? color.brand : color.label} style={face(lead ? 'bold' : 'regular')} numberOfLines={1}>
        {line.main}
      </Txt>
      {line.under && (
        <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
          {line.under.replace('1-rep max ', '1RM ')}
        </Txt>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[3] },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    pro: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brandFill },
    flex: { flex: 1, minWidth: 0 },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    side: { width: 96, alignItems: 'flex-end', textAlign: 'right', paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.sm },
    lead: { backgroundColor: color.brandTint },
  }),
);
