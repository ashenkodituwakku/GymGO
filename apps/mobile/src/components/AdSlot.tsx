/**
 * The space an advertisement goes in, on Home (under the gyms near you) and
 * under Explore's list: never between one gym and the next, never for Pro
 * members, who pay.
 *
 * GymGO has no ad partner yet (docs/ADS.md says what adding one takes), so
 * what fills it is GymGO's own card for Pro, and only where Pro can be
 * bought; elsewhere, nothing. When a partner's ads come, theirs goes here,
 * with this card standing in whenever no ad comes back. Nothing here loads
 * or tracks anything.
 *
 * "Not now" puts the card away on this device for a fortnight.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { BrandFill, Sheen } from './BrandFill';
import { Icon } from './Icon';
import { Pressy } from './motion';
import { useGlassRedraw } from './Redrawn';
import { Txt } from './ui';

export type AdPlace = 'home' | 'results';

const HIDDEN_KEY = 'gymgo.house-card.hidden-until.v1';
const HIDE_FOR_MS = 14 * 86_400_000;

/** What the card says where it stands: only what Pro really does (pro.tsx). */
const WORDS: Record<AdPlace, { title: string; detail: string }> = {
  home: { title: 'Train anywhere with Pro', detail: 'Gyms in every country, as many saved as you like, and a chart for every lift.' },
  results: { title: 'Gyms in every country', detail: 'Free covers the country you chose. Pro finds gyms wherever you travel.' },
};

/** Whether the card was put away and its fortnight isn't over (read once, shared by both places). */
let hiddenUntil: number | null = null;
const listeners = new Set<() => void>();
let read: Promise<void> | null = null;
function readHidden(): Promise<void> {
  read ??= AsyncStorage.getItem(HIDDEN_KEY)
    .then((raw) => {
      hiddenUntil = raw ? Number(raw) || 0 : 0;
    })
    .catch(() => {
      hiddenUntil = 0;
    });
  return read;
}
function hide() {
  hiddenUntil = Date.now() + HIDE_FOR_MS;
  AsyncStorage.setItem(HIDDEN_KEY, String(hiddenUntil)).catch(() => undefined);
  for (const listener of listeners) listener();
}

function useHidden(): boolean | null {
  const [, redraw] = useState(0);
  useEffect(() => {
    const listener = () => redraw((n) => n + 1);
    listeners.add(listener);
    if (hiddenUntil === null) void readHidden().then(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return hiddenUntil === null ? null : hiddenUntil > Date.now();
}

export function AdSlot({ place, style }: { place: AdPlace; style?: object }) {
  useGlassRedraw();
  const { billing, openPro } = useApp();
  const hidden = useHidden();
  // Pro never sees the space; a plan still being asked might be Pro; and where Pro can't be bought, a card for it is a dead end.
  if (billing.isPro || !billing.planKnown || billing.sale !== 'on' || hidden !== false) return null;
  const words = WORDS[place];
  return (
    <View style={style}>
      <Pressy
        scaleTo={0.98}
        onPress={() => {
          haptic.select();
          openPro(place === 'results' ? 'worldwide' : undefined);
        }}
        accessibilityRole="button"
        accessibilityLabel={`From GymGO: ${words.title}. ${words.detail} See GymGO Pro`}
        style={styles.card}
      >
        <View style={styles.badge}>
          <BrandFill round={12} />
          <Sheen round={12} />
          <Icon name="crown" size={18} color={color.onBrand} />
        </View>
        <View style={styles.words}>
          <Txt variant="eyebrow" color={color.brand}>
            GYMGO PRO
          </Txt>
          <Txt variant="headline" numberOfLines={2}>
            {words.title}
          </Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {words.detail}
          </Txt>
          <View style={styles.see}>
            <Txt variant="subhead" color={color.brand} style={face('semibold')}>
              See Pro
            </Txt>
            <Icon name="chevron" size={12} color={color.brand} />
          </View>
        </View>
      </Pressy>
      {/* Beside the card rather than inside it: a button inside a button is one a screen reader can't reach. */}
      <Pressable
        onPress={() => {
          haptic.tap();
          hide();
        }}
        accessibilityRole="button"
        accessibilityLabel="Not now: hide this for two weeks"
        hitSlop={10}
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
      >
        <Icon name="close" size={12} color={color.labelTertiary} />
      </Pressable>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[3],
      padding: space[3],
      paddingRight: space[6],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.plate,
      ...shadow.card,
    },
    badge: { width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: color.brandFill },
    words: { flex: 1, minWidth: 0, gap: 2 },
    see: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space[1] },
    close: { position: 'absolute', top: space[2], right: space[2], width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
  }),
);
