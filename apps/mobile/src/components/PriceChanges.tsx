/**
 * On Saved: notes about price changes at your saved gyms (lib/priceWatch.ts).
 * Each says the old and new published price, where the gym publishes it
 * and when that was checked; "Got it" clears them. Compared each time
 * GymGO's gym data has loaded; the prices seen are kept on this device.
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { priceLabel, type GymRecord } from '@gymgo/domain';
import { dateLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { comparePrices, type PriceChange } from '@/lib/priceWatch';
import { priceWatch } from '@/lib/priceWatchStore';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { PrimaryButton, Txt } from './ui';

export function PriceChanges({ saved, records, loaded }: { saved: readonly string[]; records: readonly GymRecord[]; loaded: boolean }) {
  const router = useRouter();
  const watch = priceWatch.use();

  // Once the gym data has loaded: compare, keep any new notes, and remember the prices as they are now.
  const savedKey = saved.join(',');
  useEffect(() => {
    if (!loaded) return;
    let gone = false;
    void priceWatch.ready().then(() => {
      if (gone) return;
      const now = priceWatch.get();
      const { changes, seen } = comparePrices(saved, records, now.seen);
      const fresh = changes.filter((change) => !now.notes.some((note) => note.id === change.id));
      priceWatch.set({ seen, notes: [...now.notes, ...fresh].slice(-50) });
    });
    return () => {
      gone = true;
    };
    // `saved` is followed through its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, records, savedKey]);

  if (watch.notes.length === 0) return null;
  return (
    <View style={styles.card} aria-live="polite">
      <View style={styles.head}>
        <Icon name="money" size={17} color={color.brand} />
        <Txt variant="headline" style={styles.flex}>
          {watch.notes.length === 1 ? 'A price changed' : 'Prices changed'}
        </Txt>
      </View>
      {watch.notes.map((note) => (
        <Pressable
          key={note.id}
          onPress={() => router.push({ pathname: '/gym/[id]', params: { id: note.gymId } })}
          accessibilityRole="link"
          accessibilityLabel={`${note.gymName}: ${changeText(note)}. ${sourceText(note)}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Txt variant="subhead" style={face('semibold')}>
              {note.gymName}
            </Txt>
            <Txt variant="subhead">{changeText(note)}</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              {sourceText(note)}
            </Txt>
          </View>
          <Icon name="chevron" size={13} color={color.labelTertiary} />
        </Pressable>
      ))}
      <PrimaryButton
        label="Got it"
        tone="quiet"
        onPress={() => {
          haptic.select();
          priceWatch.update((now) => ({ ...now, notes: [] }));
        }}
      />
    </View>
  );
}

/** "Casual visit: A$20 → A$22", "Day pass: newly published, A$30", "Casual visit: A$20, no longer published". */
export function changeText(note: PriceChange): string {
  const was = note.before ? priceLabel(note.before.amountMinor, note.before.currency) : null;
  const now = note.after ? priceLabel(note.after.amountMinor, note.after.currency) : null;
  if (was && now) return `${note.label}: ${was} → ${now}`;
  if (now) return `${note.label}: newly published, ${now}`;
  return `${note.label}: ${was}, no longer published (not known, not free)`;
}

const sourceText = (note: PriceChange) => `${note.sourceLabel}${note.checkedAt ? `, checked ${dateLabel(note.checkedAt, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`;

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[2], padding: space[4], marginBottom: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[2] },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    pressed: { opacity: 0.7 },
  }),
);
