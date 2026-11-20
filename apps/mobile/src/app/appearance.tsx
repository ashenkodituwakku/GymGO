/**
 * Appearance: light, dark or the phone's, and dark in black or Dim's soft
 * grey, for everyone; a look (how the
 * whole app is drawn: Soft, Paper, Material, Neon, Terminal, 8-bit, Classic,
 * Comic) and an accent, where Standard and Indigo are everyone's and the
 * rest are part of GymGO Pro; and Liquid Glass, how see-through the things
 * over the map are, for everyone. With Pro, too, how a record is celebrated,
 * how the sounds are voiced (Marimba, or Arcade's chip tunes) and the map's
 * style (Standard for everyone; Muted, Classic and Deep blue: lib/mapStyles.ts).
 * For everyone as well: the layout (tab bar or sidebar, drawn as tiles, and
 * whether the sidebar folds away on the map), text size, bold text and
 * Reduce motion, which keeps GymGO still without changing the phone.
 */

import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BrandFill } from '@/components/BrandFill';
import { useGlassRedraw } from '@/components/Redrawn';
import { loadAllLookFonts } from '@/lib/lookFonts';
import Animated from 'react-native-reanimated';
import { FADE_IN, Pressable } from '@/components/motion';
import { Glass } from '@/components/Glass';
import { GYMPAL_KEYS, GymPalMark } from '@/components/GymPal';
import { Icon } from '@/components/Icon';
import { PercentSlider } from '@/components/PercentSlider';
import { PrimaryButton, Txt } from '@/components/ui';
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
  backgroundImage,
  color,
  cornersFor,
  customAccent,
  currentTheme,
  dimApplies,
  face,
  glassLevelName,
  paletteFor,
  radius,
  concentric,
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
import { setThemeChoice, useThemeChoice, type GymPalButton } from '@/lib/themePrefs';
import type { NavLayout } from '@/lib/navLayout';
import { FREE_MAP_STYLE, MAP_STYLES, mapStyle, mapStyleFor, type MapPalette, type MapStyleId } from '@/lib/mapStyles';
import { useReducedMotion } from 'react-native-reanimated';
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

const LAYOUTS: Array<{ id: NavLayout; label: string; blurb: string }> = [
  { id: 'tabs', label: 'Tab bar', blurb: 'Four tabs floating at the foot' },
  { id: 'sidebar', label: 'Sidebar', blurb: 'A menu down the left, with your training' },
];

/** The clock, as the app writes a time in each: a close at 7 pm, a later one at 9:30 pm (lib/copy.ts timeLabel). */
const CLOCKS: Array<{ id: '12' | '24'; label: string; time: string; later: string }> = [
  { id: '12', label: '12-hour', time: '7\u00a0pm', later: 'until 9:30\u00a0pm' },
  { id: '24', label: '24-hour', time: '19:00', later: 'until 21:30' },
];

const GYMPAL_BUTTONS: Array<{ id: GymPalButton; label: string; blurb: string }> = [
  { id: 'tab', label: 'Edge tab', blurb: 'A small tab on the edge' },
  { id: 'corner', label: 'Corner', blurb: 'His button in the corner' },
  { id: 'hidden', label: 'Hidden', blurb: 'Nothing on screen' },
];

const GYMPAL_SIDES: Array<{ id: 'left' | 'right'; label: string }> = [
  { id: 'left', label: 'Left side' },
  { id: 'right', label: 'Right side' },
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
  // Eleven looks: rows of five where there's room for them, else threes, the last row centred.
  const [looksWide, setLooksWide] = useState(false);
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

  const pickLayout = (layout: NavLayout) => {
    if (layout === choice.layout) return;
    haptic.select();
    setThemeChoice({ layout });
  };

  // The map's style: Standard for everyone, the rest with Pro (like the looks).
  const mapStyleInUse = mapStyleFor(choice.mapStyle, billing.isPro);
  const pickMapStyle = (id: MapStyleId) => {
    if (id !== FREE_MAP_STYLE && !billing.isPro) {
      haptic.tap();
      openPro('themes');
      return;
    }
    if (id === choice.mapStyle) return;
    haptic.select();
    setThemeChoice({ mapStyle: id });
  };
  const scheme = color.label === '#FFFFFF' ? 'dark' : 'light';
  // The phone's own Reduce Motion: with it on, Appearance's switch has nothing left to do.
  const phoneCalm = useReducedMotion();

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

        <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={[styles.section, styles.headCaps]}>
          Mode
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

        <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={[styles.section, styles.sectionGap, styles.headCaps]}>
          Dark mode
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
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Layout
          </Txt>
        </View>
        <View style={styles.modes} accessibilityRole="radiogroup">
          {LAYOUTS.map((item) => {
            const on = choice.layout === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => pickLayout(item.id)}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${item.label}: ${item.blurb}`}
                style={styles.darkStyle}
              >
                <View style={[styles.preview, styles.previewWide, on && styles.previewOn]}>
                  <LayoutPreview layout={item.id} tone={scheme === 'dark' ? darkTone : 'light'} />
                </View>
                <View style={styles.darkText}>
                  <Txt variant="subhead" style={on ? face('semibold') : undefined}>
                    {item.label}
                  </Txt>
                  <Txt variant="caption" color={color.labelSecondary} style={styles.centred}>
                    {item.blurb}
                  </Txt>
                </View>
                <Icon name={on ? 'done' : 'todo'} size={22} color={on ? color.brand : color.labelTertiary} />
              </Pressable>
            );
          })}
        </View>
        {choice.layout === 'sidebar' && (
          <Animated.View entering={FADE_IN} style={[styles.glassCard, styles.layoutOptions]}>
            <View style={styles.toggleRow}>
              <View style={styles.flex}>
                <Txt variant="body">Fold away on the map</Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  A small capsule on Explore; its arrow opens the sidebar
                </Txt>
              </View>
              <Toggle
                value={choice.foldOnMap}
                onValueChange={(foldOnMap) => {
                  haptic.select();
                  setThemeChoice({ foldOnMap });
                }}
                accessibilityLabel="Fold the sidebar away on the map"
              />
            </View>
          </Animated.View>
        )}
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {choice.layout === 'sidebar'
            ? `A menu down the left with the tabs, your training and you. On a wide screen it stays open beside the page${choice.foldOnMap ? ' and folds away on the map' : ', the map included'}; on a phone, Menu at the foot slides it in.`
            : 'The four tabs float at the foot of the screen. This is the default; Sidebar puts them, with your training, in a menu down the left.'}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Text
          </Txt>
        </View>
        <View style={styles.glassCard}>
          <View style={styles.textSample} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
            <Txt variant="headline">Doherty’s Gym</Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {`Visitors welcome until ${timeLabel(21 * 60)} · Casual visit A$20`}
            </Txt>
          </View>
          {/* Each size as "Aa" at that size, so the steps show at a glance. */}
          <View style={styles.sizes} accessibilityRole="radiogroup">
            {TEXT_SIZES.map((size) => {
              const on = choice.textSize === size.id;
              return (
                <Pressable
                  key={size.id}
                  onPress={() => {
                    if (on) return;
                    haptic.select();
                    setThemeChoice({ textSize: size.id as TextSize });
                  }}
                  accessibilityRole="radio"
                  aria-checked={on}
                  accessibilityLabel={`${size.label} text, ${Math.round(size.scale * 100)}%`}
                  style={({ pressed }) => [styles.sizeTile, pressed && { opacity: 0.75 }]}
                >
                  <View style={[styles.sizeFace, on && styles.sampleOn]}>
                    <Txt style={[face('semibold'), { fontSize: Math.round(22 * size.scale), lineHeight: Math.round(28 * size.scale) }]} color={on ? color.brandOnTint : color.label} maxFontSizeMultiplier={1}>
                      Aa
                    </Txt>
                  </View>
                  <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={2}>
                    {size.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
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
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Motion
          </Txt>
        </View>
        <View style={styles.glassCard}>
          <View style={styles.toggleRow}>
            <View style={styles.flex}>
              <Txt variant="body">Reduce motion</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                Things appear in place instead of sliding, gliding and popping
              </Txt>
            </View>
            <Toggle
              value={choice.reduceMotion || phoneCalm}
              disabled={phoneCalm}
              onValueChange={(reduceMotion) => {
                haptic.select();
                setThemeChoice({ reduceMotion });
              }}
              accessibilityLabel="Reduce motion"
            />
          </View>
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {phoneCalm
            ? 'Your phone’s Reduce Motion is on, so GymGO already keeps still.'
            : 'In GymGO only, without changing your phone. Celebrations stay still with it on. Free for everyone.'}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Look
          </Txt>
          {!billing.isPro && (
            <View style={styles.proTag}>
              <Icon name="crown" size={11} color={color.brandOnTint} />
              <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
                PRO
              </Txt>
            </View>
          )}
        </View>
        <View style={styles.looks} accessibilityRole="radiogroup" onLayout={(event) => setLooksWide(event.nativeEvent.layout.width >= LOOKS_FIVE_ACROSS)}>
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
                style={({ pressed }) => [styles.lookTile, looksWide && styles.lookTileFive, pressed && { opacity: 0.75 }]}
              >
                <LookPreview look={id} accent={accentInUse} dark={choice.dark} on={on} />
                <View style={styles.lookName}>
                  {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                  <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={2}>
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
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Corners
          </Txt>
          {!billing.isPro && (
            <View style={styles.proTag}>
              <Icon name="crown" size={11} color={color.brandOnTint} />
              <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
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
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Liquid Glass
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
            ? `${LOOKS[lookInUse].name} draws everything as solid plates, so there’s no glass to set. Choose Standard, Frost or Liquid to use Liquid Glass.`
            : `How glassy GymGO is: the controls, sheets and bars over the map, and the cards on every page, with ${LOOKS[lookInUse].backdrop ? 'the page’s colours showing' : 'your accent glowing'} through from behind. 0% makes it all solid; 100% is the clearest that keeps text readable.`}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Accent
          </Txt>
          {!billing.isPro && (
            <View style={styles.proTag}>
              <Icon name="crown" size={11} color={color.brandOnTint} />
              <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
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
                <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={2}>
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
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Map
          </Txt>
          {!billing.isPro && (
            <View style={styles.proTag}>
              <Icon name="crown" size={11} color={color.brandOnTint} />
              <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
                PRO
              </Txt>
            </View>
          )}
        </View>
        <View style={styles.celebrations} accessibilityRole="radiogroup">
          {MAP_STYLES.map((item) => {
            const on = mapStyleInUse === item.id;
            const locked = item.id !== FREE_MAP_STYLE && !billing.isPro;
            return (
              <Pressable
                key={item.id}
                onPress={() => pickMapStyle(item.id)}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${item.name}: ${item.blurb}${locked ? '. Part of GymGO Pro' : ''}`}
                style={({ pressed }) => [styles.celebration, pressed && { opacity: 0.75 }]}
              >
                <View style={[styles.mapFrame, on && styles.mapFrameOn]}>
                  <MiniMap palette={item.preview} />
                </View>
                <View style={styles.lookName}>
                  {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                  <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={2}>
                    {item.name}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {mapNote(mapStyleInUse, scheme, billing.isPro)}
        </Txt>

        <View style={styles.accentHead}>
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Celebrations
          </Txt>
          {!billing.isPro && (
            <View style={styles.proTag}>
              <Icon name="crown" size={11} color={color.brandOnTint} />
              <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
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
                  <Icon name={item.icon} size={26} color={on ? color.brand : color.labelSecondary} weight="regular" />
                </View>
                <View style={styles.lookName}>
                  {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                  <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={2}>
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
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Sounds
          </Txt>
          {!billing.isPro && (
            <View style={styles.proTag}>
              <Icon name="crown" size={11} color={color.brandOnTint} />
              <Txt variant="caption" color={color.brandOnTint} style={face('semibold')}>
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
                  <Icon name={item.icon} size={26} color={on ? color.brand : color.labelSecondary} weight="regular" />
                </View>
                <View style={styles.lookName}>
                  {locked && <Icon name="crown" size={12} color={color.labelTertiary} />}
                  <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={2}>
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
          <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
            Clock
          </Txt>
        </View>
        <View style={styles.modes} accessibilityRole="radiogroup">
          {CLOCKS.map((clock) => {
            const on = (choice.clock24 ? '24' : '12') === clock.id;
            return (
              <Pressable
                key={clock.id}
                onPress={() => {
                  if (on) return;
                  haptic.select();
                  setThemeChoice({ clock24: clock.id === '24' });
                }}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${clock.label}: ${clock.time.replace('\u00a0', ' ')}`}
                style={({ pressed }) => [styles.darkStyle, pressed && { opacity: 0.75 }]}
              >
                <View style={[styles.clockFace, on && styles.sampleOn]}>
                  <Txt variant="title2" color={on ? color.brandOnTint : color.label} style={face('bold')}>
                    {clock.time}
                  </Txt>
                  <Txt variant="caption" color={on ? color.labelSecondaryOnTint : color.labelSecondary}>
                    {clock.later}
                  </Txt>
                </View>
                <Txt variant="subhead" style={on ? face('semibold') : undefined}>
                  {clock.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          {`Times read like ${timeLabel(19 * 60)}, for opening hours, visit times and reminders.`}
        </Txt>

        {prefs.gymPal && (
          <>
            <View style={styles.accentHead}>
              <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.headCaps}>
                GymPal’s button
              </Txt>
            </View>
            {/* How he waits: each drawn on the side you've chosen. */}
            <View style={styles.modes} accessibilityRole="radiogroup">
              {GYMPAL_BUTTONS.map((item) => {
                const on = choice.gymPalButton === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (on) return;
                      haptic.select();
                      setThemeChoice({ gymPalButton: item.id });
                    }}
                    accessibilityRole="radio"
                    aria-checked={on}
                    accessibilityLabel={`${item.label}: ${item.blurb}`}
                    style={styles.darkStyle}
                  >
                    <View style={[styles.preview, styles.previewWide, on && styles.previewOn]}>
                      <GymPalPreview button={item.id} side={choice.gymPalSide} tone={scheme === 'dark' ? darkTone : 'light'} />
                    </View>
                    <View style={styles.darkText}>
                      <Txt variant="subhead" style={on ? face('semibold') : undefined}>
                        {item.label}
                      </Txt>
                      <Txt variant="caption" color={color.labelSecondary} style={styles.centred}>
                        {item.blurb}
                      </Txt>
                    </View>
                    <Icon name={on ? 'done' : 'todo'} size={22} color={on ? color.brand : color.labelTertiary} />
                  </Pressable>
                );
              })}
            </View>
            {/* Which side: each drawn with the way he waits. */}
            <View style={[styles.modes, styles.sideRow]} accessibilityRole="radiogroup">
              {GYMPAL_SIDES.map((item) => {
                const on = choice.gymPalSide === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (on) return;
                      haptic.select();
                      setThemeChoice({ gymPalSide: item.id });
                    }}
                    accessibilityRole="radio"
                    aria-checked={on}
                    accessibilityLabel={`GymPal on the ${item.id} side`}
                    style={styles.sideTile}
                  >
                    <View style={[styles.preview, styles.previewSide, on && styles.previewOn]}>
                      <GymPalPreview button={choice.gymPalButton} side={item.id} tone={scheme === 'dark' ? darkTone : 'light'} />
                    </View>
                    <View style={styles.sideLabel}>
                      <Icon name={on ? 'done' : 'todo'} size={20} color={on ? color.brand : color.labelTertiary} />
                      <Txt variant="subhead" style={on ? face('semibold') : undefined}>
                        {item.label}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
              {gymPalHow(choice.gymPalButton, choice.gymPalSide)}
            </Txt>
          </>
        )}
      </PageScroll>
      {playing > 0 && <Celebration key={playing} style={celebrationInUse} />}
    </View>
  );
}

/** What each way of keeping GymPal does, and the other ways in. */
function gymPalHow(button: GymPalButton, side: 'left' | 'right'): string {
  const keys = Platform.OS === 'web' ? ` On a computer, ${GYMPAL_KEYS} opens him too.` : '';
  const off = ' To have no GymPal at all, switch him off in Profile → Settings.';
  if (button === 'tab') return `A small tab on the ${side} edge of the screen, low down: tap it, or pull it in.${keys}${off}`;
  if (button === 'corner') return `His button in the bottom ${side} corner.${keys}${off}`;
  return `Nothing on screen.${Platform.OS === 'web' ? ` ${GYMPAL_KEYS} opens him` : ` Swipe in from the ${side} edge, near the bottom, to open him`}, or Profile → Ask GymPal and the Ask GymPal buttons.${off}`;
}

/** "Your own" among the accents: the colour you picked, or a rainbow ring before you have. */
/** What the map style in use looks like, and where it differs. */
function mapNote(id: MapStyleId, scheme: 'light' | 'dark', isPro: boolean): string {
  const style = mapStyle(id);
  const dark = scheme === 'dark' && id !== 'deep' ? ' In dark mode every style but Deep blue shows the dark map.' : '';
  // An iPhone draws Apple's map, which has nothing like Classic.
  const apple = Platform.OS === 'ios' ? ' On iPhone it’s Apple’s map: Muted is its muted map, Deep blue its dark one, and Classic its standard map.' : '';
  const pro = isPro ? '' : ' Muted, Classic and Deep blue come with GymGO Pro.';
  return `${style.blurb}, on Explore’s map.${dark}${apple}${pro}`;
}

/** A tiny screen in each layout: the tab bar floating at its foot, or the sidebar down its left. */
function LayoutPreview({ layout, tone }: { layout: NavLayout; tone: keyof typeof PREVIEW }) {
  const p = PREVIEW[tone];
  return (
    <View style={[styles.layoutScreen, { backgroundColor: p.page }]}>
      {layout === 'sidebar' && (
        <View style={[styles.layoutSide, { backgroundColor: p.card }]}>
          <View style={[styles.layoutRow, { backgroundColor: color.brandTint }]}>
            <View style={[styles.layoutDot, { backgroundColor: color.brand }]} />
            <View style={[styles.miniLine, styles.layoutLine, { backgroundColor: color.brand }]} />
          </View>
          {[0.7, 0.55, 0.65, 0.5].map((width, index) => (
            <View key={index} style={styles.layoutRow}>
              <View style={[styles.layoutDot, { backgroundColor: p.line }]} />
              <View style={[styles.miniLine, { backgroundColor: p.line, width: `${width * 100}%` }]} />
            </View>
          ))}
        </View>
      )}
      <View style={styles.layoutBody}>
        <View style={[styles.miniCard, { backgroundColor: p.card }]}>
          <View style={[styles.miniLine, { backgroundColor: p.text, width: '70%' }]} />
          <View style={[styles.miniLine, { backgroundColor: p.line, width: '50%' }]} />
        </View>
        <View style={[styles.miniCard, { backgroundColor: p.card }]}>
          <View style={[styles.miniLine, { backgroundColor: p.text, width: '60%' }]} />
          <View style={[styles.miniLine, { backgroundColor: p.line, width: '40%' }]} />
        </View>
      </View>
      {layout === 'tabs' && (
        <View style={[styles.layoutTabs, { backgroundColor: p.card }]}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.layoutDot, { backgroundColor: index === 0 ? color.brand : p.line }]} />
          ))}
        </View>
      )}
    </View>
  );
}

/** A tiny screen with GymPal waiting on it: his tab on the edge, his button in the corner, or (hidden) only the strip you swipe in from. */
function GymPalPreview({ button, side, tone }: { button: GymPalButton; side: 'left' | 'right'; tone: keyof typeof PREVIEW }) {
  const p = PREVIEW[tone];
  const left = side === 'left';
  return (
    <View style={[styles.mini, { backgroundColor: p.page }]}>
      <View style={[styles.miniCard, { backgroundColor: p.card }]}>
        <View style={[styles.miniLine, { backgroundColor: p.text, width: '70%' }]} />
        <View style={[styles.miniLine, { backgroundColor: p.line, width: '50%' }]} />
      </View>
      <View style={[styles.miniCard, { backgroundColor: p.card }]}>
        <View style={[styles.miniLine, { backgroundColor: p.text, width: '60%' }]} />
        <View style={[styles.miniLine, { backgroundColor: p.line, width: '40%' }]} />
      </View>
      {/* As the app draws them: a light tab flush with the edge, holding his mark; in the corner, his mark itself. */}
      {button === 'tab' && (
        <View style={[styles.palTab, left ? styles.palTabLeft : styles.palTabRight, { backgroundColor: p.card }]}>
          <GymPalMark size={11} still />
        </View>
      )}
      {button === 'corner' && (
        <View style={[styles.palCorner, left ? { left: 7 } : { right: 7 }]}>
          <GymPalMark size={20} still />
        </View>
      )}
      {button === 'hidden' && <View style={[styles.palStrip, left ? { left: 0 } : { right: 0 }, { backgroundColor: color.brand }]} />}
    </View>
  );
}

/** A tiny map in a style's own colours: land, a lake, a park, a main road and a side street. */
function MiniMap({ palette }: { palette: MapPalette }) {
  return (
    <View style={[styles.miniMap, { backgroundColor: palette.land }]}>
      <View style={[styles.miniWater, { backgroundColor: palette.water }]} />
      <View style={[styles.miniPark, { backgroundColor: palette.park }]} />
      <View style={[styles.miniMinor, { backgroundColor: palette.minor }]} />
      <View style={[styles.miniMajor, { backgroundColor: palette.major }]} />
    </View>
  );
}

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
      <Txt variant="footnote" color={on ? color.label : color.labelSecondary} style={on ? face('semibold') : undefined} numberOfLines={2}>
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
      <Icon name={icon} size={16} color={color.brandOnTint} />
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

/** How wide the looks' grid is before five go across (each tile then about 100 points, as wide as a preview gets). */
const LOOKS_FIVE_ACROSS = 500;

/** A tiny screen drawn in a look: its page, a card, a title in its type and a button. */
function LookPreview({ look, accent, dark, on }: { look: LookId; accent: AccentId; dark: DarkStyle; on: boolean }) {
  const spec = LOOKS[look];
  const scheme = spec.scheme ?? currentTheme().scheme;
  const palette = paletteFor(scheme, accent, look, undefined, dark);
  const shadows = spec.shadows?.(scheme, palette.brand);
  const corner = (value: number) => Math.min(value * 0.5, 12);
  const title = spec.fonts?.display ?? spec.fonts?.body?.bold;
  // A look with a page of its own (Frost) shows it, and its card as the glass over it.
  const backdrop = spec.backdrop?.(scheme, ACCENTS[accent][scheme].brand);
  // A sample only: the tile's own name says which look this is.
  return (
    <View aria-hidden style={[styles.lookFrame, on && { borderColor: color.brand }]}>
      <View style={[styles.lookPage, { backgroundColor: palette.groupedBackground }, backdrop && backgroundImage(backdrop.image)]}>
        <View style={[styles.lookCard, { backgroundColor: backdrop ? palette.plate : palette.card, borderRadius: corner(spec.radius.lg) }, backdrop ? shadows?.plate : shadows?.card]}>
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
    // The tile plates: their contents one gap (12) in, so the tiles' corners follow the plate's (concentric).
    modes: { flexDirection: 'row', gap: space[3], padding: space[3], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    mode: { flex: 1, alignItems: 'center', gap: space[2] },
    preview: { width: '100%', aspectRatio: 0.62, borderRadius: concentric(radius.lg, space[3]), borderCurve: 'continuous', borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
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
    // The layout tiles' tiny screens.
    layoutScreen: { flex: 1, flexDirection: 'row', padding: 6, gap: 6 },
    layoutSide: { width: '40%', borderRadius: 6, padding: 4, gap: 3 },
    layoutRow: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 3, borderRadius: 4 },
    layoutDot: { width: 5, height: 5, borderRadius: 2.5 },
    layoutLine: { width: '60%', opacity: 0.7 },
    layoutBody: { flex: 1, gap: 5 },
    layoutTabs: { position: 'absolute', bottom: 7, left: '24%', right: '24%', height: 13, borderRadius: 6.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', ...shadow.plate },
    layoutOptions: { marginTop: space[3] },
    // Text sizes, as "Aa" at each size.
    sizes: { flexDirection: 'row', gap: space[2] },
    sizeTile: { flex: 1, alignItems: 'center', gap: space[1] },
    sizeFace: { alignSelf: 'stretch', height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: concentric(radius.lg, space[3]), borderCurve: 'continuous', backgroundColor: color.fill, borderWidth: 2, borderColor: 'transparent' },
    // The clock's faces: a time as the app writes it.
    clockFace: { alignSelf: 'stretch', paddingVertical: space[3], alignItems: 'center', gap: 2, borderRadius: concentric(radius.lg, space[3]), borderCurve: 'continuous', backgroundColor: color.fill, borderWidth: 2, borderColor: 'transparent' },
    // GymPal's button: where he waits on the tiny screens.
    palTab: { position: 'absolute', bottom: 10, width: 17, height: 30, alignItems: 'center', justifyContent: 'center', ...shadow.plate },
    palTabLeft: { left: 0, borderTopRightRadius: 9, borderBottomRightRadius: 9 },
    palTabRight: { right: 0, borderTopLeftRadius: 9, borderBottomLeftRadius: 9 },
    palCorner: { position: 'absolute', bottom: 7, ...shadow.plate },
    palStrip: { position: 'absolute', bottom: 8, width: 3, height: 26, borderRadius: 1.5, opacity: 0.4 },
    previewSide: { aspectRatio: 1.9 },
    sideRow: { marginTop: space[3] },
    sideTile: { flex: 1, alignItems: 'center', gap: space[2] },
    sideLabel: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
    // The map style tiles' tiny maps.
    mapFrame: { width: '100%', maxWidth: 76, aspectRatio: 1, padding: 3, borderRadius: radius.md + 3, borderWidth: 2, borderColor: 'transparent' },
    mapFrameOn: { borderColor: color.brand },
    miniMap: { flex: 1, borderRadius: concentric(radius.md + 3, 5), overflow: 'hidden' },
    miniWater: { position: 'absolute', right: '-22%', top: '-18%', width: '62%', height: '58%', borderRadius: 40 },
    miniPark: { position: 'absolute', left: '-12%', bottom: '-10%', width: '56%', height: '44%', borderRadius: 24, transform: [{ rotate: '-10deg' }] },
    miniMinor: { position: 'absolute', left: '64%', top: '-20%', width: 3, height: '140%', transform: [{ rotate: '20deg' }] },
    miniMajor: { position: 'absolute', left: '-20%', right: '-20%', top: '50%', height: 5, borderRadius: 2, transform: [{ rotate: '-12deg' }] },
    accentHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginLeft: space[4], marginTop: space[6], marginBottom: space[2] },
    // Each section's name: a heading to jump between, written as words and drawn in capitals (VoiceOver spelt out "GYMPAL").
    headCaps: { textTransform: 'uppercase' },
    proTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill, backgroundColor: color.brandTint },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    tile: { width: '20%', minWidth: 64, alignItems: 'center', gap: space[1], paddingVertical: space[2] },
    ring: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
    swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    looks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    lookTile: { width: '33.33%', alignItems: 'center', gap: space[1], paddingVertical: space[2], paddingHorizontal: space[1] },
    lookTileFive: { width: '20%' },
    lookFrame: { width: '100%', maxWidth: 104, aspectRatio: 0.9, padding: 3, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
    lookPage: { flex: 1, borderRadius: concentric(14, 5), overflow: 'hidden', padding: 8, gap: 8, justifyContent: 'space-between' },
    lookCard: { padding: 6, gap: 5 },
    lookLine: { height: 4, width: '70%', opacity: 0.5 },
    lookButton: { height: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    lookName: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    celebrations: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    celebration: { width: '25%', minWidth: 72, alignItems: 'center', gap: space[1], paddingVertical: space[2] },
    soundPack: { flex: 1, alignItems: 'center', gap: space[1], paddingVertical: space[2], paddingHorizontal: space[2] },
    sampleTile: { width: 56, height: 56, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill, borderWidth: 2, borderColor: 'transparent' },
    sampleOn: { borderColor: color.brand, backgroundColor: color.brandTint },
    playRow: { marginTop: space[3] },
    flex: { flex: 1 },
    textSample: { gap: 2, padding: space[3], borderRadius: concentric(radius.lg, space[3]), borderCurve: 'continuous', backgroundColor: color.fill },
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
