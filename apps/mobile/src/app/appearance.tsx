/**
 * Appearance: light, dark or the phone's, and dark in black or Dim's soft
 * grey, for everyone; a look (how the
 * whole app is drawn: Soft, Paper, Material, Neon, Terminal, 8-bit, Classic,
 * Comic) and an accent, where Standard and Indigo are everyone's and the
 * rest are part of GymGO Pro; and Liquid Glass, how see-through the things
 * over the map are, for everyone. With Pro, too, how a record is celebrated
 * and how the sounds are voiced (Marimba, or Arcade's chip tunes).
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandFill } from '@/components/BrandFill';
import { useGlassRedraw } from '@/components/Redrawn';
import { loadAllLookFonts } from '@/lib/lookFonts';
import Animated from 'react-native-reanimated';
import { FADE_IN, Pressable } from '@/components/motion';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { PercentSlider } from '@/components/PercentSlider';
import { PrimaryButton, Segmented, Txt } from '@/components/ui';
import { Toggle } from '@/components/Toggle';
import { timeLabel } from '@/lib/copy';
import { Celebration } from '@/components/Celebration';
import { CELEBRATIONS, FREE_CELEBRATION, celebrationFor, type CelebrationStyle } from '@/lib/celebrations';
import { playSound } from '@/lib/sounds';
import { FREE_SOUND_PACK, SOUND_PACKS, soundPackFor, type SoundPack } from '@/lib/soundPacks';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import {
  ACCENTS,
  ACCENT_IDS,
  ACCENT_PAINTS,
  CORNER_STYLES,
  FREE_ACCENT,
  FREE_LOOK,
  GLASS_DEFAULT,
  GLASS_STEP,
  LOOKS,
  LOOK_IDS,
  TEXT_SIZES,
  color,
  cornersFor,
  customAccent,
  currentTheme,
  dimApplies,
  face,
  glassLevelName,
  paletteFor,
  radius,
  shadow,
  space,
  themed,
  type AccentId,
  type AppearanceChoice,
  type CornerStyle,
  type DarkStyle,
  type LookId,
  type TextSize,
} from '@/lib/theme';
import { setThemeChoice, useThemeChoice } from '@/lib/themePrefs';
import type { NavLayout } from '@/lib/navLayout';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';
import { ScreenOptions } from '@/components/ScreenOptions';

const MODES: Array<{ id: AppearanceChoice; label: string }> = [
  { id: 'system', label: 'Automatic' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const DARK_STYLES: Array<{ id: DarkStyle; label: string; blurb: string }> = [
  { id: 'black', label: 'Black', blurb: 'True black, darkest at night' },
  { id: 'dim', label: 'Dim', blurb: 'A soft blue-grey, easier in a lit room' },
];

/** A tiny screen in each mode, drawn from the real palettes. */
const PREVIEW = {
  light: { page: '#F2F2F7', card: '#FFFFFF', line: '#D1D1D6', text: '#000000' },
  dark: { page: '#000000', card: '#1C1C1E', line: '#3A3A3C', text: '#FFFFFF' },
  dim: { page: '#17191F', card: '#23262E', line: '#363B46', text: '#FFFFFF' },
} as const;

export default function AppearanceScreen() {
  useGlassRedraw();
  usePageTitle('Appearance');
  const choice = useThemeChoice();
  const { billing, openPro, prefs, setPref } = useApp();

  const pickMode = (appearance: AppearanceChoice) => {
    if (appearance === choice.appearance) return;
    haptic.select();
    setThemeChoice({ appearance });
  };
  const pickDark = (dark: DarkStyle) => {
    if (dark === choice.dark) return;
    haptic.select();
    setThemeChoice({ dark });
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
  // The mode previews draw dark the way it'll look: Dim's grey where it applies.
  const darkTone = dimApplies('dark', lookInUse, choice.dark) ? 'dim' : 'dark';
  const accentInUse = billing.isPro || choice.accent === FREE_ACCENT ? choice.accent : FREE_ACCENT;

  // Liquid Glass: the preview follows the finger; the app redraws once it's let go.
  const [glass, setGlass] = useState(choice.glass);
  useEffect(() => setGlass(choice.glass), [choice.glass]);
  const keepGlass = (level: number) => {
    setGlass(level);
    if (level !== choice.glass) setThemeChoice({ glass: level });
  };
  const solidLook = LOOKS[lookInUse].solid;
  const glassWords = solidLook ? 'Solid' : `${glass}%, ${glassLevelName(glass)}${glass === GLASS_DEFAULT ? ', the default' : ''}`;

  // Celebrations: yours with Pro, confetti without. Picking one plays it.
  const celebrationInUse = celebrationFor(prefs.celebration, billing.isPro);
  const [playing, setPlaying] = useState(0);
  const pickCelebration = (style: CelebrationStyle) => {
    if (style !== FREE_CELEBRATION && !billing.isPro) {
      haptic.tap();
      openPro('celebrations');
      return;
    }
    haptic.select();
    if (style !== prefs.celebration) setPref('celebration', style);
    setPlaying((count) => count + 1);
  };

  // Sounds: Arcade with Pro, Marimba without. Picking one plays a record in it.
  const packInUse = soundPackFor(prefs.soundPack, billing.isPro);
  const pickSoundPack = (soundPack: SoundPack) => {
    if (soundPack !== FREE_SOUND_PACK && !billing.isPro) {
      haptic.tap();
      openPro('sounds');
      return;
    }
    haptic.select();
    if (soundPack !== prefs.soundPack) setPref('soundPack', soundPack);
    playSound('record', 0, soundPack);
  };

  // Corners: rounder or sharper than the look's, with Pro (like the looks).
  const cornersInUse = billing.isPro ? choice.corners : 'standard';
  const squareLook = LOOKS[lookInUse].radius.md === 0;
  const pickCorners = (corners: CornerStyle) => {
    if (corners !== 'standard' && !billing.isPro) {
      haptic.tap();
      openPro('themes');
      return;
    }
    haptic.select();
    if (corners !== choice.corners) setThemeChoice({ corners });
  };

  // Your own accent: the preview follows the finger; the app takes it once it's let go.
  const [hue, setHue] = useState(choice.customHue);
  useEffect(() => setHue(choice.customHue), [choice.customHue]);
  const keepHue = (next: number) => {
    setHue(next);
    if (next !== choice.customHue) setThemeChoice({ customHue: next });
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
    <View style={styles.flex}>
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: 'Appearance' }} />

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
                      <MiniScreen tone={darkTone} />
                    </View>
                  ) : (
                    <MiniScreen tone={mode.id === 'dark' ? darkTone : mode.id} />
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

        <Txt variant="footnote" color={color.labelSecondary} style={[styles.section, styles.sectionGap]}>
          DARK MODE
        </Txt>
        <View style={styles.modes} accessibilityRole="radiogroup">
          {DARK_STYLES.map((style) => {
            const on = choice.dark === style.id;
            return (
              <Pressable
                key={style.id}
                onPress={() => pickDark(style.id)}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${style.label}: ${style.blurb}`}
                style={styles.darkStyle}
              >
                <View style={[styles.preview, styles.previewWide, on && styles.previewOn]}>
                  <MiniScreen tone={style.id === 'dim' ? 'dim' : 'dark'} />
                </View>
                <View style={styles.darkText}>
                  <Txt variant="subhead" style={on ? face('semibold') : undefined}>
                    {style.label}
                  </Txt>
                  <Txt variant="caption" color={color.labelSecondary} style={styles.centred}>
                    {style.blurb}
                  </Txt>
                </View>
                <Icon name={on ? 'done' : 'todo'} size={22} color={on ? color.brand : color.labelTertiary} />
              </Pressable>
            );
          })}
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {lookInUse === FREE_LOOK ? 'How GymGO looks whenever it’s dark.' : `${LOOKS[lookInUse].name} draws dark its own way. Dim is for the Standard look.`}
        </Txt>

        {/* How you get around: the floating tab bar (the default) or a sidebar menu (lib/navLayout.ts). */}
        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary}>
            LAYOUT
          </Txt>
        </View>
        <View style={styles.glassCard}>
          <Segmented
            options={[
              { value: 'tabs', label: 'Tab bar' },
              { value: 'sidebar', label: 'Sidebar' },
            ]}
            value={choice.layout}
            onChange={(layout: NavLayout) => {
              haptic.select();
              setThemeChoice({ layout });
            }}
          />
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {choice.layout === 'sidebar'
            ? 'A menu down the left with the tabs, your training and you. On a wide screen it stays open beside the page; on a phone, Menu at the foot slides it in.'
            : 'The four tabs float at the foot of the screen. This is the default; Sidebar puts them, with your training, in a menu down the left.'}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary}>
            TEXT
          </Txt>
        </View>
        <View style={styles.glassCard}>
          <View style={styles.textSample} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
            <Txt variant="headline">Doherty’s Gym</Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {`Visitors welcome until ${timeLabel(21 * 60)} · Casual visit A$20`}
            </Txt>
          </View>
          <Segmented
            options={TEXT_SIZES.map((size) => ({ value: size.id, label: size.label }))}
            value={choice.textSize}
            onChange={(textSize: TextSize) => {
              haptic.select();
              setThemeChoice({ textSize });
            }}
          />
          <View style={styles.toggleRow}>
            <View style={styles.flex}>
              <Txt variant="body">Bold text</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                Every word a step heavier
              </Txt>
            </View>
            <Toggle
              value={choice.bold}
              onValueChange={(bold) => {
                haptic.select();
                setThemeChoice({ bold });
              }}
              accessibilityLabel="Bold text"
            />
          </View>
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          On top of your phone’s own text size. Free for everyone.
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
                <LookPreview look={id} accent={accentInUse} dark={choice.dark} on={on} />
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
          {LOOKS[lookInUse].blurb}.{LOOKS[lookInUse].scheme === 'dark' ? ` ${LOOKS[lookInUse].name} is always dark, whatever the mode above.` : ''} Evidence colours keep their meaning in every look.
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary}>
            CORNERS
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
        <View style={styles.modes} accessibilityRole="radiogroup">
          {CORNER_STYLES.map((style) => {
            const on = cornersInUse === style.id;
            const locked = style.id !== 'standard' && !billing.isPro;
            const corner = cornersFor(LOOKS[lookInUse].radius, style.id).lg;
            return (
              <Pressable
                key={style.id}
                onPress={() => pickCorners(style.id)}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${style.label}: ${style.blurb}${locked ? '. Part of GymGO Pro' : ''}`}
                style={styles.darkStyle}
              >
                <View style={[styles.cornerPreview, { borderRadius: corner }, on && styles.cornerOn]}>
                  <View style={[styles.cornerButton, { borderRadius: Math.min(corner, 14) }]} />
                </View>
                <View style={styles.lookName}>
                  {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                  <Txt variant="subhead" style={on ? face('semibold') : undefined}>
                    {style.label}
                  </Txt>
                </View>
                <Icon name={on ? 'done' : 'todo'} size={22} color={on ? color.brand : color.labelTertiary} />
              </Pressable>
            );
          })}
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {squareLook
            ? `${LOOKS[lookInUse].name} is square by design, so its corners stay square.`
            : `${CORNER_STYLES.find((style) => style.id === cornersInUse)!.blurb}, on cards, buttons and sheets. Round buttons and pills stay round.`}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary}>
            LIQUID GLASS
          </Txt>
        </View>
        <View style={styles.glassCard}>
          <GlassPreview level={solidLook ? 0 : glass} />
          <View style={styles.glassHead}>
            <Txt variant="title2" style={face('bold')}>
              {solidLook ? 'Solid' : `${glass}%`}
            </Txt>
            <Txt variant="subhead" color={color.labelSecondary} style={styles.flex} numberOfLines={1}>
              {solidLook ? `in ${LOOKS[lookInUse].name}` : `${glassLevelName(glass)}${glass === GLASS_DEFAULT ? ' · default' : ''}`}
            </Txt>
            {!solidLook && glass !== GLASS_DEFAULT && (
              <Pressable onPress={() => keepGlass(GLASS_DEFAULT)} accessibilityRole="button" accessibilityLabel={`Back to the default, ${GLASS_DEFAULT}%`} hitSlop={8}>
                <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                  Default
                </Txt>
              </Pressable>
            )}
          </View>
          <View style={styles.sliderRow}>
            <StepButton icon="minus" label="Less glass" onPress={!solidLook && glass > 0 ? () => keepGlass(Math.max(0, glass - GLASS_STEP)) : undefined} />
            <PercentSlider
              value={solidLook ? 0 : glass}
              step={GLASS_STEP}
              onChange={setGlass}
              onCommit={keepGlass}
              disabled={solidLook}
              label="Liquid Glass"
              valueText={glassWords}
            />
            <StepButton icon="plus" label="More glass" onPress={!solidLook && glass < 100 ? () => keepGlass(Math.min(100, glass + GLASS_STEP)) : undefined} />
          </View>
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {solidLook
            ? `${LOOKS[lookInUse].name} draws everything as solid plates, so there’s no glass to set. Choose Standard to use Liquid Glass.`
            : 'How glassy GymGO is: the controls, sheets and bars over the map, and the cards on every page, with your accent glowing through from behind. 0% makes it all solid; 100% is the clearest that keeps text readable.'}
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
          <CustomTile hue={hue} on={accentInUse === 'custom'} locked={!billing.isPro} onPress={() => pickAccent('custom')} />
        </View>
        {accentInUse === 'custom' && (
          <View style={[styles.glassCard, styles.hueCard]}>
            <View style={styles.glassHead}>
              <View style={[styles.hueDot, { backgroundColor: customAccent(hue)[color.label === '#FFFFFF' ? 'dark' : 'light'].brand }]} />
              <Txt variant="subhead" color={color.labelSecondary} style={styles.flex}>
                Slide to pick your colour
              </Txt>
            </View>
            <View style={styles.hueTrack} aria-hidden>
              {Array.from({ length: 24 }, (_, index) => (
                <View key={index} style={[styles.hueStop, { backgroundColor: customAccent(index * 15).light.brandFill }]} />
              ))}
            </View>
            {/* In a row, as the glass slider is: its flex: 1 would leave it no height in a column. */}
            <View style={styles.sliderRow}>
              <PercentSlider
                value={Math.round((hue / 359) * 100)}
                step={1}
                onChange={(percent) => setHue(Math.round((percent / 100) * 359))}
                onCommit={(percent) => keepHue(Math.round((percent / 100) * 359))}
                label="Your own accent colour"
                valueText={`Hue ${hue} degrees`}
              />
            </View>
            <Txt variant="footnote" color={color.labelSecondary}>
              GymGO shades it so text in it, and on its buttons, stays easy to read in light and dark.
            </Txt>
          </View>
        )}
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {billing.isPro
            ? 'The accent colours buttons, links and your selections. Evidence colours (green, orange, grey) never change, so they always mean the same thing.'
            : 'Indigo is everyone’s. The rest, from Midnight and Lagoon to Rainbow and Camo, come with GymGO Pro, as do the looks. Dark mode is free for everyone.'}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary}>
            CELEBRATIONS
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
        <View style={styles.celebrations} accessibilityRole="radiogroup">
          {CELEBRATIONS.map((item) => {
            const on = celebrationInUse === item.id;
            const locked = item.id !== FREE_CELEBRATION && !billing.isPro;
            return (
              <Pressable
                key={item.id}
                onPress={() => pickCelebration(item.id)}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${item.name}: ${item.blurb}${locked ? '. Part of GymGO Pro' : ''}`}
                style={({ pressed }) => [styles.celebration, pressed && { opacity: 0.75 }]}
              >
                <View style={[styles.sampleTile, on && styles.sampleOn]}>
                  <Text style={styles.sample}>{item.sample}</Text>
                </View>
                <View style={styles.lookName}>
                  {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                  <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={1}>
                    {item.name}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.playRow}>
          <PrimaryButton label="Play it" icon="play" tone="quiet" onPress={() => setPlaying((count) => count + 1)} />
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {`${CELEBRATIONS.find((item) => item.id === celebrationInUse)!.blurb}. It plays over the workout summary when you set a record or meet your weekly goal${billing.isPro ? '' : '; fireworks, gold stars and emoji come with GymGO Pro'}. Never with Reduce Motion on.`}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary}>
            SOUNDS
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
        <View style={styles.celebrations} accessibilityRole="radiogroup">
          {SOUND_PACKS.map((item) => {
            const on = packInUse === item.id;
            const locked = item.id !== FREE_SOUND_PACK && !billing.isPro;
            return (
              <Pressable
                key={item.id}
                onPress={() => pickSoundPack(item.id)}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${item.name}: ${item.blurb}${locked ? '. Part of GymGO Pro' : ''}`}
                style={({ pressed }) => [styles.soundPack, pressed && { opacity: 0.75 }]}
              >
                <View style={[styles.sampleTile, on && styles.sampleOn]}>
                  <Text style={styles.sample}>{item.sample}</Text>
                </View>
                <View style={styles.lookName}>
                  {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                  <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={1}>
                    {item.name}
                  </Txt>
                </View>
                <Txt variant="caption" color={color.labelSecondary} style={styles.centred}>
                  {item.blurb}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {prefs.sounds
            ? `Tap one to hear a new record in it. It voices check-ins, records, sets and the timers; the cards keep their own sounds${billing.isPro ? '' : '. Arcade comes with GymGO Pro'}.`
            : 'Sounds are off, so there’s nothing to hear: turn them on in Profile → Settings.'}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary}>
            CLOCK
          </Txt>
        </View>
        <View style={styles.glassCard}>
          <Segmented
            options={[
              { value: '12', label: '12-hour' },
              { value: '24', label: '24-hour' },
            ]}
            value={choice.clock24 ? '24' : '12'}
            onChange={(value: string) => {
              haptic.select();
              setThemeChoice({ clock24: value === '24' });
            }}
          />
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {`Times read like ${timeLabel(19 * 60)}, for opening hours, visit times and reminders.`}
        </Txt>

        {prefs.gymPal && (
          <>
            <View style={styles.accentHead}>
              <Txt variant="footnote" color={color.labelSecondary}>
                GYMPAL’S BUTTON
              </Txt>
            </View>
            <View style={styles.glassCard}>
              <Segmented
                options={[
                  { value: 'left', label: 'Bottom left' },
                  { value: 'right', label: 'Bottom right' },
                ]}
                value={choice.gymPalSide}
                onChange={(gymPalSide: 'left' | 'right') => {
                  haptic.select();
                  setThemeChoice({ gymPalSide });
                }}
              />
            </View>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
              Which corner GymPal waits in. To hide him altogether, switch GymPal off in Profile → Settings.
            </Txt>
          </>
        )}
      </PageScroll>
      {playing > 0 && <Celebration key={playing} style={celebrationInUse} />}
    </View>
  );
}

/** "Your own" among the accents: the colour you picked, or a rainbow ring before you have. */
function CustomTile({ hue, on, locked, onPress }: { hue: number; on: boolean; locked: boolean; onPress: () => void }) {
  const scheme = color.label === '#FFFFFF' ? 'dark' : 'light';
  const mine = customAccent(hue);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      aria-checked={on}
      accessibilityLabel={`Your own colour${locked ? ', part of GymGO Pro' : ''}`}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.ring, on && { borderColor: mine[scheme].brand }]}>
        <View style={[styles.swatch, { backgroundColor: mine[scheme].brandFill }]}>
          {on ? <Icon name="check" size={18} color={color.onBrand} /> : locked ? <Icon name="crown" size={14} color={color.onBrandSoft} /> : <Icon name="plus" size={16} color={color.onBrand} />}
        </View>
      </View>
      <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={1}>
        Your own
      </Txt>
    </Pressable>
  );
}

/** A step of the Liquid Glass slider, for a finger that wants one exact step. */
function StepButton({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        haptic.select();
        onPress();
      }}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={!onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.step, !onPress && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={16} color={color.brand} />
    </Pressable>
  );
}

/** Map colours for the preview: land, a park, water and roads, in light and dark. */
const MAP = {
  light: { land: '#ECE7DE', park: '#C5E3B4', water: '#A9D0F0', road: '#FFFFFF', minor: '#F8F5EF' },
  dark: { land: '#26282B', park: '#1E3526', water: '#1A2B3D', road: '#46484D', minor: '#323438' },
} as const;

/**
 * A little map with GymGO's glass over it, at the level being chosen: the
 * search pill and the sheet, as on Explore, so you can see how much shows
 * through before you let go.
 */
function GlassPreview({ level }: { level: number }) {
  const map = MAP[currentTheme().scheme];
  return (
    <View style={[styles.previewMap, { backgroundColor: map.land }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.park, { backgroundColor: map.park }]} />
      <View style={[styles.water, { backgroundColor: map.water }]} />
      <View style={[styles.road, styles.roadA, { backgroundColor: map.road }]} />
      <View style={[styles.road, styles.roadB, { backgroundColor: map.road }]} />
      <View style={[styles.minor, styles.minorA, { backgroundColor: map.minor }]} />
      <View style={[styles.minor, styles.minorB, { backgroundColor: map.minor }]} />
      {PINS.map((pin, index) => (
        <View key={index} style={[styles.pin, { left: pin.left, top: pin.top, backgroundColor: color[pin.tone] }]} />
      ))}
      <Glass kind="control" level={level} style={styles.previewPill}>
        <Icon name="search" size={13} color={color.labelSecondary} />
        <Txt variant="caption" color={color.labelSecondary}>
          Search
        </Txt>
      </Glass>
      <Glass kind="sheet" level={level} style={styles.previewSheet}>
        <View style={styles.previewHandle} />
        <Txt variant="footnote" style={face('semibold')}>
          Gyms near you
        </Txt>
        <View style={[styles.previewLine, { width: '62%' }]} />
        <View style={[styles.previewLine, { width: '44%' }]} />
      </Glass>
    </View>
  );
}

/** Pins on the preview map, some under the glass. */
const PINS: Array<{ left: `${number}%`; top: number; tone: 'good' | 'maybe' | 'brandFill' }> = [
  { left: '12%', top: 18, tone: 'maybe' },
  { left: '30%', top: 22, tone: 'good' },
  { left: '74%', top: 36, tone: 'brandFill' },
  { left: '52%', top: 64, tone: 'maybe' },
  { left: '20%', top: 104, tone: 'good' },
  { left: '64%', top: 112, tone: 'maybe' },
  { left: '84%', top: 128, tone: 'good' },
];

/** A tiny screen drawn in a look: its page, a card, a title in its type and a button. */
function LookPreview({ look, accent, dark, on }: { look: LookId; accent: AccentId; dark: DarkStyle; on: boolean }) {
  const spec = LOOKS[look];
  const scheme = spec.scheme ?? currentTheme().scheme;
  const palette = paletteFor(scheme, accent, look, undefined, dark);
  const shadows = spec.shadows?.(scheme, palette.brand);
  const corner = (value: number) => Math.min(value * 0.5, 12);
  const title = spec.fonts?.display ?? spec.fonts?.body?.bold;
  return (
    <View style={[styles.lookFrame, on && { borderColor: color.brand }]}>
      <View style={[styles.lookPage, { backgroundColor: palette.groupedBackground }]}>
        <View style={[styles.lookCard, { backgroundColor: palette.card, borderRadius: corner(spec.radius.lg) }, shadows?.card]}>
          <Txt variant="caption" color={palette.label} style={[{ fontSize: Math.round(11 * (spec.fonts?.displayScale ?? 1)), lineHeight: 14 }, title ? { fontFamily: title, fontWeight: 'normal' } : face('bold')]} numberOfLines={1}>
            GymGO
          </Txt>
          <View style={[styles.lookLine, { backgroundColor: palette.labelSecondary, borderRadius: corner(spec.radius.sm) }]} />
        </View>
        <View style={[styles.lookButton, { backgroundColor: palette.brandFill, borderRadius: Math.min(corner(spec.radius.pill), 9) }, shadows?.float]}>
          <BrandFill paint={ACCENT_PAINTS[accent] ?? null} />
          <Txt variant="caption" color={palette.onBrand} style={[{ fontSize: 9, lineHeight: 12 }, spec.fonts?.body ? { fontFamily: spec.fonts.body.semibold, fontWeight: 'normal' } : face('semibold')]}>
            Go
          </Txt>
        </View>
      </View>
    </View>
  );
}

function MiniScreen({ tone }: { tone: keyof typeof PREVIEW }) {
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
    // As every settings list's headings (components/ios.tsx's Group).
    section: { marginLeft: space[4], marginBottom: space[2], letterSpacing: 0.5, ...face('semibold') },
    modes: { flexDirection: 'row', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    mode: { flex: 1, alignItems: 'center', gap: space[2] },
    preview: { width: '100%', aspectRatio: 0.62, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
    previewOn: { borderColor: color.brand },
    previewWide: { aspectRatio: 1.3 },
    sectionGap: { marginTop: space[6] },
    darkStyle: { flex: 1, alignItems: 'center', gap: space[2] },
    // Grows, so both radio circles sit level whichever line wraps.
    darkText: { flexGrow: 1, alignItems: 'center', gap: 2 },
    centred: { textAlign: 'center' },
    split: { flex: 1, flexDirection: 'row' },
    mini: { flex: 1, padding: 6, gap: 5 },
    miniBar: { height: 8, borderRadius: 4, width: '55%' },
    miniCard: { borderRadius: 5, padding: 5, gap: 4 },
    miniLine: { height: 4, borderRadius: 2 },
    note: { marginHorizontal: space[4], marginTop: space[2] },
    accentHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginLeft: space[4], marginTop: space[6], marginBottom: space[2] },
    proTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill, backgroundColor: color.brandTint },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    tile: { width: '20%', minWidth: 64, alignItems: 'center', gap: space[1], paddingVertical: space[2] },
    ring: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
    swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    looks: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    lookTile: { width: '33.33%', alignItems: 'center', gap: space[1], paddingVertical: space[2], paddingHorizontal: space[1] },
    lookFrame: { width: '100%', maxWidth: 104, aspectRatio: 0.9, padding: 3, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
    lookPage: { flex: 1, borderRadius: 10, overflow: 'hidden', padding: 8, gap: 8, justifyContent: 'space-between' },
    lookCard: { padding: 6, gap: 5 },
    lookLine: { height: 4, width: '70%', opacity: 0.5 },
    lookButton: { height: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    lookName: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    celebrations: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    celebration: { width: '25%', minWidth: 72, alignItems: 'center', gap: space[1], paddingVertical: space[2] },
    soundPack: { flex: 1, alignItems: 'center', gap: space[1], paddingVertical: space[2], paddingHorizontal: space[2] },
    sampleTile: { width: 56, height: 56, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill, borderWidth: 2, borderColor: 'transparent' },
    sampleOn: { borderColor: color.brand, backgroundColor: color.brandTint },
    sample: { fontSize: 28, lineHeight: 34 },
    playRow: { marginTop: space[3] },
    flex: { flex: 1 },
    textSample: { gap: 2, padding: space[3], borderRadius: radius.md, backgroundColor: color.fill },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[1] },
    cornerPreview: { width: '100%', aspectRatio: 1.25, padding: 10, justifyContent: 'flex-end', backgroundColor: color.fill, borderWidth: 2, borderColor: 'transparent' },
    cornerOn: { borderColor: color.brand },
    cornerButton: { height: 18, backgroundColor: color.brandFill },
    hueCard: { marginTop: space[3] },
    hueDot: { width: 18, height: 18, borderRadius: 9 },
    hueTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
    hueStop: { flex: 1 },
    glassCard: { gap: space[3], padding: space[3], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    glassHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], paddingHorizontal: space[1] },
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    previewMap: { height: 168, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
    park: { position: 'absolute', left: '-6%', top: 54, width: '46%', height: 70, borderRadius: 30, transform: [{ rotate: '-8deg' }] },
    water: { position: 'absolute', right: '-10%', top: -20, width: '42%', height: 90, borderRadius: 46 },
    road: { position: 'absolute', height: 9, borderRadius: 2 },
    roadA: { left: '-10%', right: '-10%', top: 80, transform: [{ rotate: '-11deg' }] },
    roadB: { left: '44%', width: 9, height: 240, top: -30, transform: [{ rotate: '18deg' }] },
    minor: { position: 'absolute', height: 5, borderRadius: 2 },
    minorA: { left: '-10%', right: '-10%', top: 134, transform: [{ rotate: '6deg' }] },
    minorB: { left: '76%', width: 5, height: 240, top: -30, transform: [{ rotate: '-24deg' }] },
    pin: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color.pinBorder },
    previewPill: { position: 'absolute', top: 10, left: 10, right: '34%', height: 32, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
    previewSheet: { position: 'absolute', left: 8, right: 8, bottom: -14, height: 86, borderRadius: radius.sheet, padding: 12, paddingTop: 8, gap: 6 },
    previewHandle: { alignSelf: 'center', width: 30, height: 4, borderRadius: 2, backgroundColor: color.handle, marginBottom: 2 },
    previewLine: { height: 6, borderRadius: 3, backgroundColor: color.fillStrong },
  }),
);
