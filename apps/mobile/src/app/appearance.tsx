/**
 * Appearance: light, dark or the phone's, for everyone; a look (how the
 * whole app is drawn: 8-bit, Classic, Material, Neon) and an accent, where
 * Standard and Indigo are everyone's and the rest are part of GymGO Pro.
 */

import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BrandFill } from '@/components/BrandFill';
import { loadAllLookFonts } from '@/lib/lookFonts';
import Animated from 'react-native-reanimated';
import { FADE_IN } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import {
  ACCENTS,
  ACCENT_IDS,
  ACCENT_PAINTS,
  FREE_ACCENT,
  FREE_LOOK,
  LOOKS,
  LOOK_IDS,
  color,
  currentTheme,
  face,
  paletteFor,
  radius,
  shadow,
  space,
  themed,
  type AccentId,
  type AppearanceChoice,
  type LookId,
} from '@/lib/theme';
import { setThemeChoice, useThemeChoice } from '@/lib/themePrefs';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';

const MODES: Array<{ id: AppearanceChoice; label: string }> = [
  { id: 'system', label: 'Automatic' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/** A tiny screen in each mode, drawn from the real palettes. */
const PREVIEW = {
  light: { page: '#F2F2F7', card: '#FFFFFF', line: '#D1D1D6', text: '#000000' },
  dark: { page: '#000000', card: '#1C1C1E', line: '#3A3A3C', text: '#FFFFFF' },
} as const;

export default function AppearanceScreen() {
  usePageTitle('Appearance');
  const choice = useThemeChoice();
  const { billing, openPro } = useApp();

  const pickMode = (appearance: AppearanceChoice) => {
    if (appearance === choice.appearance) return;
    haptic.select();
    setThemeChoice({ appearance });
  };
  const pickLook = (look: LookId) => {
    if (look !== FREE_LOOK && !billing.isPro) {
      haptic.tap();
      openPro('themes');
      return;
    }
    if (look === choice.look) return;
    haptic.select();
    setThemeChoice({ look });
  };
  // The previews draw each look in its own typefaces.
  const [, setFontsReady] = useState(false);
  useEffect(() => {
    void loadAllLookFonts().then(() => setFontsReady(true));
  }, []);
  const lookInUse = billing.isPro || choice.look === FREE_LOOK ? choice.look : FREE_LOOK;
  const accentInUse = billing.isPro || choice.accent === FREE_ACCENT ? choice.accent : FREE_ACCENT;

  const pickAccent = (accent: AccentId) => {
    if (accent !== FREE_ACCENT && !billing.isPro) {
      haptic.tap();
      openPro('themes');
      return;
    }
    if (accent === choice.accent) return;
    haptic.select();
    setThemeChoice({ accent });
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Appearance' }} />

      <Txt variant="footnote" color={color.labelSecondary} style={styles.section}>
        MODE
      </Txt>
      <View style={styles.modes}>
        {MODES.map((mode) => {
          const on = choice.appearance === mode.id;
          return (
            <Pressable
              key={mode.id}
              onPress={() => pickMode(mode.id)}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={mode.id === 'system' ? 'Automatic: follow your phone' : mode.label}
              style={styles.mode}
            >
              <View style={[styles.preview, on && styles.previewOn]}>
                {mode.id === 'system' ? (
                  <View style={styles.split}>
                    <MiniScreen tone="light" />
                    <MiniScreen tone="dark" />
                  </View>
                ) : (
                  <MiniScreen tone={mode.id} />
                )}
              </View>
              <Txt variant="subhead" style={on ? face('semibold') : undefined}>
                {mode.label}
              </Txt>
              <Icon name={on ? 'done' : 'todo'} size={22} color={on ? color.brand : color.labelTertiary} />
            </Pressable>
          );
        })}
      </View>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        Automatic follows your phone, so GymGO goes dark when your phone does.
      </Txt>

      <View style={styles.accentHead}>
        <Txt variant="footnote" color={color.labelSecondary}>
          LOOK
        </Txt>
        {!billing.isPro && (
          <View style={styles.proTag}>
            <Icon name="crown" size={11} color={color.brand} />
            <Txt variant="caption" color={color.brand} style={face('semibold')}>
              PRO
            </Txt>
          </View>
        )}
      </View>
      <View style={styles.looks} accessibilityRole="radiogroup">
        {LOOK_IDS.map((id) => {
          const on = lookInUse === id;
          const locked = id !== FREE_LOOK && !billing.isPro;
          return (
            <Pressable
              key={id}
              onPress={() => pickLook(id)}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={`${LOOKS[id].name}: ${LOOKS[id].blurb}${locked ? '. Part of GymGO Pro' : ''}`}
              style={({ pressed }) => [styles.lookTile, pressed && { opacity: 0.75 }]}
            >
              <LookPreview look={id} accent={accentInUse} on={on} />
              <View style={styles.lookName}>
                {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={1}>
                  {LOOKS[id].name}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        {LOOKS[lookInUse].blurb}.{LOOKS[lookInUse].scheme === 'dark' ? ' Neon is always dark, whatever the mode above.' : ''} Evidence colours keep their meaning in every look.
      </Txt>

      <View style={styles.accentHead}>
        <Txt variant="footnote" color={color.labelSecondary}>
          ACCENT
        </Txt>
        {!billing.isPro && (
          <View style={styles.proTag}>
            <Icon name="crown" size={11} color={color.brand} />
            <Txt variant="caption" color={color.brand} style={face('semibold')}>
              PRO
            </Txt>
          </View>
        )}
      </View>
      {/* A grid of swatches, round the colour wheel. */}
      <View style={styles.grid} accessibilityRole="radiogroup">
        {ACCENT_IDS.map((id) => {
          const accent = ACCENTS[id];
          // The accent in use: a Pro accent kept from before shows as Indigo without Pro.
          const on = (billing.isPro || choice.accent === FREE_ACCENT ? choice.accent : FREE_ACCENT) === id;
          const locked = id !== FREE_ACCENT && !billing.isPro;
          const scheme = color.label === '#FFFFFF' ? 'dark' : 'light';
          return (
            <Pressable
              key={id}
              onPress={() => pickAccent(id)}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={`${accent.name}${locked ? ', part of GymGO Pro' : ''}`}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.ring, on && { borderColor: accent[scheme].brand }]}>
                <View style={[styles.swatch, { backgroundColor: accent[scheme].brandFill }]}>
                  {ACCENT_PAINTS[id] && <BrandFill paint={ACCENT_PAINTS[id]} />}
                  {on ? (
                    <Animated.View entering={FADE_IN}>
                      <Icon name="check" size={18} color={color.onBrand} />
                    </Animated.View>
                  ) : locked ? (
                    <Icon name="crown" size={14} color={color.onBrandSoft} />
                  ) : null}
                </View>
              </View>
              <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={1}>
                {accent.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        {billing.isPro
          ? 'The accent colours buttons, links and your selections. Evidence colours (green, orange, grey) never change, so they always mean the same thing.'
          : 'Indigo is everyone’s. The rest, from Midnight and Lagoon to Rainbow and Camo, come with GymGO Pro, as do the looks. Dark mode is free for everyone.'}
      </Txt>
    </PageScroll>
  );
}

/** A tiny screen drawn in a look: its page, a card, a title in its type and a button. */
function LookPreview({ look, accent, on }: { look: LookId; accent: AccentId; on: boolean }) {
  const spec = LOOKS[look];
  const scheme = spec.scheme ?? currentTheme().scheme;
  const palette = paletteFor(scheme, accent, look);
  const shadows = spec.shadows?.(scheme, palette.brand);
  const corner = (value: number) => Math.min(value * 0.5, 12);
  const title = spec.fonts?.display ?? spec.fonts?.body.bold;
  return (
    <View style={[styles.lookFrame, on && { borderColor: color.brand }]}>
      <View style={[styles.lookPage, { backgroundColor: palette.groupedBackground }]}>
        <View style={[styles.lookCard, { backgroundColor: palette.card, borderRadius: corner(spec.radius.lg) }, shadows?.card]}>
          <Txt variant="caption" color={palette.label} style={[{ fontSize: spec.fonts?.display ? 7 : 11, lineHeight: 14 }, title ? { fontFamily: title, fontWeight: 'normal' } : face('bold')]} numberOfLines={1}>
            GymGO
          </Txt>
          <View style={[styles.lookLine, { backgroundColor: palette.labelSecondary, borderRadius: corner(spec.radius.sm) }]} />
        </View>
        <View style={[styles.lookButton, { backgroundColor: palette.brandFill, borderRadius: Math.min(corner(spec.radius.pill), 9) }, shadows?.float]}>
          <BrandFill paint={ACCENT_PAINTS[accent] ?? null} />
          <Txt variant="caption" color={palette.onBrand} style={[{ fontSize: 9, lineHeight: 12 }, spec.fonts ? { fontFamily: spec.fonts.body.semibold, fontWeight: 'normal' } : face('semibold')]}>
            Go
          </Txt>
        </View>
      </View>
    </View>
  );
}

function MiniScreen({ tone }: { tone: 'light' | 'dark' }) {
  const p = PREVIEW[tone];
  return (
    <View style={[styles.mini, { backgroundColor: p.page }]}>
      <View style={[styles.miniBar, { backgroundColor: color.brandFill }]} />
      <View style={[styles.miniCard, { backgroundColor: p.card }]}>
        <View style={[styles.miniLine, { backgroundColor: p.text, width: '70%' }]} />
        <View style={[styles.miniLine, { backgroundColor: p.line, width: '50%' }]} />
      </View>
      <View style={[styles.miniCard, { backgroundColor: p.card }]}>
        <View style={[styles.miniLine, { backgroundColor: p.text, width: '60%' }]} />
        <View style={[styles.miniLine, { backgroundColor: p.line, width: '40%' }]} />
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], width: '100%', maxWidth: 560, alignSelf: 'center' },
    section: { marginLeft: space[4], marginBottom: space[2], letterSpacing: 0.4 },
    modes: { flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.card, ...shadow.plate },
    mode: { flex: 1, alignItems: 'center', gap: space[2] },
    preview: { width: '100%', aspectRatio: 0.62, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
    previewOn: { borderColor: color.brand },
    split: { flex: 1, flexDirection: 'row' },
    mini: { flex: 1, padding: 6, gap: 5 },
    miniBar: { height: 8, borderRadius: 4, width: '55%' },
    miniCard: { borderRadius: 5, padding: 5, gap: 4 },
    miniLine: { height: 4, borderRadius: 2 },
    note: { marginHorizontal: space[4], marginTop: space[2] },
    accentHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginLeft: space[4], marginTop: space[6], marginBottom: space[2] },
    proTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill, backgroundColor: color.brandTint },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.card, ...shadow.plate },
    tile: { width: '20%', minWidth: 64, alignItems: 'center', gap: space[1], paddingVertical: space[2] },
    ring: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
    swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    looks: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.card, ...shadow.plate },
    lookTile: { width: '33.33%', alignItems: 'center', gap: space[1], paddingVertical: space[2], paddingHorizontal: space[1] },
    lookFrame: { width: '100%', maxWidth: 104, aspectRatio: 0.9, padding: 3, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
    lookPage: { flex: 1, borderRadius: 10, overflow: 'hidden', padding: 8, gap: 8, justifyContent: 'space-between' },
    lookCard: { padding: 6, gap: 5 },
    lookLine: { height: 4, width: '70%', opacity: 0.5 },
    lookButton: { height: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    lookName: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    flex: { flex: 1 },
  }),
);
