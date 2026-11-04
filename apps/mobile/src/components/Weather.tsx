/**
 * The weather where you're searching (lib/weather.ts has where it comes
 * from): two Home widgets, **Weather** (one row: now) and **Weather by the
 * hour** (now and the next six hours), and a small circle that's always on
 * the map. All show MET Norway's forecast for your area in °C (°F in the
 * US) with MET Norway's own weather symbols (lib/weatherArt.ts, from Yr's
 * set), and say whose forecast it is and when it was made.
 *
 * When there's no forecast the widgets and the circle say why (loading,
 * unavailable just now, signed out, no server, switched off), with a
 * thermometer, never a symbol or a temperature that wasn't forecast.
 */

import { WEATHER_CREDIT, hoursFrom, tempLabel, tempUnitFor, weatherWords, type Weather, type WeatherHour } from '@gymgo/domain';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useApp } from '@/lib/app-state';
import { timeLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { THIS_AREA, YOUR_LOCATION, nowIn } from '@/lib/query';
import { color, currentTheme, face, radius, shadow, space, themed } from '@/lib/theme';
import { WEATHER_ART } from '@/lib/weatherArt';
import { useWeather, type WeatherState } from '@/lib/weather';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Txt } from './ui';

/**
 * MET Norway's symbol for an hour, as a picture. Yr drew them for a white
 * page, so in dark mode they sit on a pale disc, where the dark moon and
 * blue rain still read. Nothing for a symbol it doesn't have.
 */
export function WeatherSymbol({ symbol, size }: { symbol: string | null; size: number }) {
  const source = symbol ? WEATHER_ART[symbol] : undefined;
  const dark = currentTheme().scheme === 'dark';
  if (!source) return <View style={{ width: size, height: size }} />;
  const inner = dark ? Math.round(size * 0.82) : size;
  const picture = <Image source={source} style={{ width: inner, height: inner }} resizeMode="contain" accessible={false} aria-hidden />;
  if (!dark) return picture;
  return <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>{picture}</View>;
}

/** "the Melbourne CBD area", "your area", "this area". */
function areaWords(placeName: string): string {
  if (placeName === YOUR_LOCATION) return 'your area';
  if (placeName === THIS_AREA) return 'this area';
  return `the ${placeName} area`;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** An hour's time where the search is ("9 pm"), not the phone's. */
function hourLabel(at: string, timezone: string): string {
  return timeLabel(nowIn(timezone, new Date(at)).minute);
}

/** The hour under way and the next ones; null when the forecast is all in the past. */
function reading(weather: Weather, now: Date) {
  const hours = hoursFrom(weather, now);
  const current = hours[0];
  if (!current) return null;
  return { current, next: hours.slice(1, 7) };
}

/** When the forecast was made, where the search is. */
const madeAt = (weather: Weather, timezone: string) => timeLabel(nowIn(timezone, new Date(weather.updatedAt)).minute);

/** The forecast's source and age: "Weather data from MET Norway · forecast made 8:17 pm". */
function madeLine(weather: Weather, timezone: string): string {
  return `${WEATHER_CREDIT} · forecast made ${madeAt(weather, timezone)}`;
}

/** Why there's no forecast to show, in a sentence. */
function missingLine(state: WeatherState): string {
  if (state.status === 'ready') return 'No forecast for this hour yet.';
  if (state.status === 'loading') return 'Getting the forecast…';
  if (state.status === 'none') return 'No forecast just now: MET Norway couldn’t be reached. GymGO tries again in a few minutes.';
  if (state.why === 'signedOut') return 'Sign in (it’s free) to see the weather here.';
  if (state.why === 'noServer') return 'The weather comes through GymGO’s server, which this website doesn’t have yet.';
  return 'The weather is switched off on this GymGO server.';
}

/** What's shown, or why nothing is. */
function useShown() {
  const { filters, prefs } = useApp();
  const state = useWeather(filters.centre);
  const read = state.status === 'ready' ? reading(state.weather, new Date()) : null;
  return { state, read, unit: tempUnitFor(prefs.country), where: areaWords(filters.placeName), timezone: filters.timezone };
}

/** Home's Weather: one row, now. */
export function WeatherCompact() {
  const { state, read, unit, where, timezone } = useShown();
  if (state.status !== 'ready' || !read) {
    return (
      <View style={[styles.compact, styles.card]} aria-live="polite">
        <View style={styles.missingIcon}>
          <Icon name="thermometer" size={18} color={color.labelSecondary} />
        </View>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
          {missingLine(state)}
        </Txt>
      </View>
    );
  }
  const words = weatherWords(read.current.symbol);
  const temp = tempLabel(read.current.tempC, unit);
  return (
    <Animated.View
      entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
      style={[styles.compact, styles.card]}
      accessible
      accessibilityLabel={`Weather in ${where}: ${temp}${words ? `, ${words.toLowerCase()}` : ''}. ${madeLine(state.weather, timezone)}.`}
    >
      <WeatherSymbol symbol={read.current.symbol} size={40} />
      <Txt variant="title2" style={[face('bold'), styles.temp]}>
        {temp}
      </Txt>
      <View style={styles.flex}>
        <Txt variant="subhead" style={face('semibold')} numberOfLines={1}>
          {words ?? 'Now'}
        </Txt>
        <Txt variant="caption" color={color.labelSecondary} numberOfLines={2}>
          {`${capital(where)} · MET Norway, ${madeAt(state.weather, timezone)}`}
        </Txt>
      </View>
    </Animated.View>
  );
}

/** Home's Weather by the hour: now, then the next six hours. */
export function WeatherHours() {
  const { state, read, unit, where, timezone } = useShown();
  if (state.status !== 'ready' || !read) return <WeatherCompact />;
  const words = weatherWords(read.current.symbol);
  const temp = tempLabel(read.current.tempC, unit);
  const nextWords = read.next
    .map((hour) => `${hourLabel(hour.at, timezone)} ${tempLabel(hour.tempC, unit)}${weatherWords(hour.symbol) ? `, ${weatherWords(hour.symbol)!.toLowerCase()}` : ''}`)
    .join('; ');
  return (
    <Animated.View
      entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
      style={[styles.card, styles.hoursCard]}
      accessible
      accessibilityLabel={`Weather in ${where}: ${temp}${words ? `, ${words.toLowerCase()}` : ''}. ${nextWords ? `Next hours: ${nextWords}. ` : ''}${madeLine(state.weather, timezone)}.`}
    >
      <View style={styles.compact}>
        <WeatherSymbol symbol={read.current.symbol} size={34} />
        <Txt variant="headline" style={face('bold')}>
          {temp}
        </Txt>
        <Txt variant="subhead" style={[face('semibold'), styles.flex]} numberOfLines={1}>
          {words ?? 'Now'}
        </Txt>
      </View>
      {read.next.length > 0 && (
        <View style={styles.hours}>
          {read.next.map((hour) => (
            <HourCell key={hour.at} hour={hour} unit={unit} timezone={timezone} />
          ))}
        </View>
      )}
      <Txt variant="caption" color={color.labelTertiary} numberOfLines={2} style={styles.credit}>
        {`${capital(where)} · ${madeLine(state.weather, timezone)}`}
      </Txt>
    </Animated.View>
  );
}

function HourCell({ hour, unit, timezone }: { hour: WeatherHour; unit: 'C' | 'F'; timezone: string }) {
  return (
    <View style={styles.hour}>
      <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
        {hourLabel(hour.at, timezone)}
      </Txt>
      <WeatherSymbol symbol={hour.symbol} size={28} />
      <Txt variant="footnote" style={face('semibold')}>
        {tempLabel(hour.tempC, unit)}
      </Txt>
    </View>
  );
}

/**
 * The map: a small circle under its buttons, always there. With a
 * forecast, its symbol and the degrees; without, a thermometer and a dash.
 * A tap says it in words: the weather, the area and whose forecast, or why
 * there isn't one.
 */
export function WeatherBadge() {
  const { state, read, unit, where, timezone } = useShown();
  const [open, setOpen] = useState(false);
  const ready = state.status === 'ready' && read ? { weather: state.weather, read } : null;
  const words = ready ? weatherWords(ready.read.current.symbol) : null;
  const temp = ready ? tempLabel(ready.read.current.tempC, unit) : null;
  const label = ready ? `Weather in ${where}: ${temp}${words ? `, ${words.toLowerCase()}` : ''}` : `Weather: ${missingLine(state)}`;
  return (
    <View style={styles.badgeWrap}>
      {open && (
        <Animated.View
          entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
          style={styles.tip}
          pointerEvents="none"
        >
          <Glass style={styles.tipGlass}>
            {ready ? (
              <>
                <Txt variant="footnote" style={face('semibold')} numberOfLines={1}>
                  {`${words ? `${words}, ` : ''}${temp}`}
                </Txt>
                <Txt variant="caption" color={color.label} numberOfLines={2}>
                  {`${capital(where)}, now`}
                </Txt>
                <Txt variant="caption" color={color.labelSecondary} numberOfLines={3}>
                  {madeLine(ready.weather, timezone)}
                </Txt>
              </>
            ) : (
              <Txt variant="caption" color={color.label} numberOfLines={4}>
                {missingLine(state)}
              </Txt>
            )}
          </Glass>
        </Animated.View>
      )}
      <Pressable
        onPress={() => {
          haptic.select();
          setOpen(!open);
        }}
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityLabel={label}
        accessibilityHint={ready ? 'Says whose forecast it is and when it was made' : undefined}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Glass style={styles.badge} interactive>
          {ready ? <WeatherSymbol symbol={ready.read.current.symbol} size={24} /> : <Icon name="thermometer" size={16} color={color.labelSecondary} />}
          <Txt variant="caption" style={[face('bold'), styles.badgeTemp]} color={ready ? color.label : color.labelSecondary} numberOfLines={1}>
            {temp ?? (state.status === 'loading' ? '…' : '–')}
          </Txt>
        </Glass>
      </Pressable>
    </View>
  );
}

const BADGE = 48;

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    card: { borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    compact: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[3], paddingVertical: space[2] + 2 },
    temp: { minWidth: 44 },
    missingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    hoursCard: { gap: space[2], paddingBottom: space[3] },
    hours: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space[2] },
    hour: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
    credit: { paddingHorizontal: space[3] },
    // A pale disc for Yr's symbols on a dark page.
    disc: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4E8F2' },
    badgeWrap: { alignItems: 'flex-end' },
    badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: 'center', justifyContent: 'center' },
    badgeTemp: { fontSize: 12, lineHeight: 14 },
    tip: { position: 'absolute', right: BADGE + space[2], top: 0, width: 220 },
    tipGlass: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, gap: 2 },
    pressed: { opacity: 0.7 },
  }),
);
