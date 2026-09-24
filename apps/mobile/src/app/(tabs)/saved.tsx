/**
 * Saved: the gyms you kept, with their answer for your current search, and
 * a tick on each to pick up to three to compare side by side.
 */

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GymRow } from '@/components/GymRow';
import { Icon } from '@/components/Icon';
import { TabScreen } from '@/components/ios';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { timeLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { resultsById } from '@/lib/results';
import { color, face, radius, space } from '@/lib/theme';

export default function Saved() {
  const { data, account, filters, compare, toggleCompare, requestExplore, billing, openPro } = useApp();
  const router = useRouter();
  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const byId = useMemo(() => resultsById(filters, data.records, asOf), [filters, data.records, asOf]);
  const saved = account.saved.map((id) => byId.get(id)).filter((result) => result !== undefined);
  const picked = compare.filter((id) => byId.has(id));

  return (
    <TabScreen
      title="Saved"
      eyebrow={saved.length ? `${saved.length} GYM${saved.length === 1 ? '' : 'S'} · FOR ${timeLabel(filters.visitMinuteOfDay).toUpperCase()}` : undefined}
      right={
        picked.length >= 2 ? (
          <Pressable
            onPress={() => router.push('/compare')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.compareButton, pressed && { opacity: 0.7 }]}
          >
            <Txt variant="subhead" color={color.onBrand} style={face('bold')}>
              Compare {picked.length}
            </Txt>
          </Pressable>
        ) : undefined
      }
    >
      {saved.length === 0 ? (
        <View style={styles.empty}>
          <Txt style={styles.emptyEmoji}>🔖</Txt>
          <Txt variant="title2">Nothing saved yet</Txt>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
            Tap Save on any gym and it lands here.{' '}
            {account.account ? 'It follows you between your phone and your PC.' : 'Sign in and it follows you to your PC too.'}
          </Txt>
          <PrimaryButton
            label="Find a gym"
            onPress={() => {
              requestExplore({ recentre: true });
              router.navigate('/explore');
            }}
          />
        </View>
      ) : (
        <>
          <Txt variant="footnote" color={color.labelSecondary}>
            Tick up to {billing.limits.compare} to compare them side by side.
            {billing.isPro ? '' : ` ${account.saved.length} of ${billing.limits.savedGyms} saved on Free.`}
          </Txt>
          {!billing.isPro && account.saved.length >= billing.limits.savedGyms - 2 && (
            <Pressable onPress={() => openPro('saved')} accessibilityRole="button" style={styles.upsell}>
              <Txt variant="subhead" color={color.brand} style={face('bold')}>
                ✨ Save as many as you like with GymGO Pro
              </Txt>
            </Pressable>
          )}
          <View style={styles.list}>
            {saved.map((result, index) => {
              const id = result.record.location.id;
              const on = compare.includes(id);
              return (
                <View key={id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <GymRow
                        result={result}
                        visitMinute={filters.visitMinuteOfDay}
                        cover={data.covers[id] ?? null}
                        onPress={() => router.push({ pathname: '/gym/[id]', params: { id } })}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        haptic.select();
                        toggleCompare(id);
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`Compare ${result.record.location.name}`}
                      hitSlop={8}
                      style={[styles.tick, on && styles.tickOn]}
                    >
                      {on && <Icon name="check" size={13} color={color.onBrand} weight="bold" />}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            {account.account ? 'Synced to your account.' : 'Saved on this device. Sign in in Profile to keep them on your PC too.'}
          </Txt>
        </>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  compareButton: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.brand,
    marginBottom: 4,
  },
  empty: {
    alignItems: 'center',
    gap: space[3],
    padding: space[6],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  emptyEmoji: { fontSize: 48, lineHeight: 58 },
  list: { backgroundColor: color.background, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  upsell: { paddingVertical: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: space[3] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: 86 },
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: color.labelTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: color.brand, borderColor: color.brand },
});
