/**
 * Appearance: light, dark or the phone's, for everyone; and an accent, of
 * which Indigo is everyone's and the rest are part of GymGO Pro.
 */

import { Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FADE_IN } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { ACCENTS, ACCENT_IDS, FREE_ACCENT, color, face, radius, space, themed, type AccentId, type AppearanceChoice } from '@/lib/theme';
import { setThemeChoice, useThemeChoice } from '@/lib/themePrefs';

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
  const choice = useThemeChoice();
  const { billing, openPro } = useApp();

  const pickMode = (appearance: AppearanceChoice) => {
    if (appearance === choice.appearance) return;
    haptic.select();
    setThemeChoice({ appearance });
  };
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
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
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
              accessibilityState={{ checked: on }}
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
      <View style={styles.group}>
        {ACCENT_IDS.map((id, index) => {
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
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${accent.name}${locked ? ', part of GymGO Pro' : ''}`}
              style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.pressed }]}
            >
              <View style={[styles.swatch, { backgroundColor: accent[scheme].brandFill }]}>
                {on && <Icon name="check" size={14} color={color.onBrand} />}
              </View>
              <Txt variant="body" style={styles.flex}>
                {accent.name}
              </Txt>
              {locked ? (
                <Icon name="crown" size={15} color={color.labelTertiary} />
              ) : (
                on && (
                  <Animated.View entering={FADE_IN}>
                    <Icon name="check" size={17} color={color.brand} />
                  </Animated.View>
                )
              )}
            </Pressable>
          );
        })}
      </View>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        {billing.isPro
          ? 'The accent colours buttons, links and your selections. Evidence colours (green, orange, grey) never change, so they always mean the same thing.'
          : 'Indigo is everyone’s. Ocean, Grape, Rose and Graphite come with GymGO Pro. Dark mode is free for everyone.'}
      </Txt>
    </ScrollView>
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
    modes: { flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.card },
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
    group: { borderRadius: radius.lg, backgroundColor: color.card, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    swatch: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1 },
  }),
);
