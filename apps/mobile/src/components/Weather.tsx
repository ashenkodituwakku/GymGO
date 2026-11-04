/**
 * The weather where you're searching: a card on Home and a small circle on
 * the map (lib/weather.ts has where it comes from). Both show MET Norway's
 * forecast for your area's hour now, in °C (°F in the US), with the
 * platform's own weather symbols, and say whose forecast it is and when it
 * was made. The card adds the next few hours.
 *
 * Nothing at all while it loads, fails or is switched off: no placeholder
 * temperature, and no icon for weather that wasn't forecast.
 */

import { WEATHER_CREDIT, hoursFrom, tempLabel, tempUnitFor, weatherKind, weatherWords, type Weather, type WeatherHour } from '@gymgo/domain';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useApp } from '@/lib/app-state';
import { timeLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { THIS_AREA, YOUR_LOCATION, nowIn } from '@/lib/query';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { useWeather } from '@/lib/weather';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { Pressable } from './motion';
import { Txt } from './ui';

/** The symbol for an hour, day or night; a plain cloud for one MET Norway didn't name (never a sun that wasn't forecast). */
export function weatherIcon(symbol: string | null): IconName | null {
  const read = weatherKind(symbol);
  if (!read) return null;
  switch (read.kind) {
    case 'clear':
    case 'fair':
      return read.night ? 'weatherMoon' : 'weatherSun';
    case 'partly':
      return read.night ? 'weatherPartlyNight' : 'weatherPartly';
    case 'cloudy':
      return 'weatherCloud';
    case 'fog':
      return 'weatherFog';
    case 'drizzle':
      return 'weatherDrizzle';
    case 'rain':
      return 'weatherRain';
    case 'heavyRain':
      return 'weatherHeavyRain';
    case 'sleet':
      return 'weatherSleet';
    case 'snow':
      return 'weatherSnow';
    case 'thunder':
      return 'weatherThunder';
  }
}

/** The sun and the moon in their own colours; the rest in the accent. */
function iconColour(icon: IconName): string {
  if (icon === 'weatherSun' || icon === 'weatherPartly') return color.maybe;
  return color.brand;
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

/** What's shown, from the forecast: the hour under way and the next ones; null when it's all in the past. */
function reading(weather: Weather, now: Date) {
  const hours = hoursFrom(weather, now);
  const current = hours[0];
  if (!current) return null;
  return { current, next: hours.slice(1, 7) };
}

/** The forecast's source and age, as said under it. */
function madeLine(weather: Weather, timezone: string): string {
  return `${WEATHER_CREDIT} · forecast made ${timeLabel(nowIn(timezone, new Date(weather.updatedAt)).minute)}`;
}

/** Home: the weather where you're searching, now and the next six hours. Nothing until there's a forecast. */
export function WeatherCard() {
  const { filters, prefs } = useApp();
  const state = useWeather(filters.centre);
  if (state.status !== 'ready') return null;
  const read = reading(state.weather, new Date());
  if (!read) return null;
  const unit = tempUnitFor(prefs.country);
  const words = weatherWords(read.current.symbol);
  const icon = weatherIcon(read.current.symbol);
  const where = areaWords(filters.placeName);
  const nextWords = read.next.map((hour) => `${hourLabel(hour.at, filters.timezone)} ${tempLabel(hour.tempC, unit)}${weatherWords(hour.symbol) ? `, ${weatherWords(hour.symbol)!.toLowerCase()}` : ''}`).join('; ');
  return (
    <Animated.View
      entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
      style={styles.card}
      accessible
      accessibilityLabel={`Weather in ${where}: ${tempLabel(read.current.tempC, unit)}${words ? `, ${words.toLowerCase()}` : ''}. ${nextWords ? `Next hours: ${nextWords}. ` : ''}${madeLine(state.weather, filters.timezone)}.`}
    >
      <View style={styles.now}>
        {icon && (
          <View style={styles.nowIcon}>
            <Icon name={icon} size={26} color={iconColour(icon)} />
          </View>
        )}
        <Txt variant="title" style={face('bold')}>
          {tempLabel(read.current.tempC, unit)}
        </Txt>
        <View style={styles.flex}>
          <Txt variant="headline" numberOfLines={1}>
            {words ?? 'Now'}
          </Txt>
          <Txt variant="caption" color={color.labelSecondary} numberOfLines={2}>
            {`${capital(where)}, now`}
          </Txt>
        </View>
      </View>
      {read.next.length > 0 && (
        <View style={styles.hours}>
          {read.next.map((hour) => (
            <HourCell key={hour.at} hour={hour} unit={unit} timezone={filters.timezone} />
          ))}
        </View>
      )}
      <Txt variant="caption" color={color.labelTertiary} numberOfLines={2}>
        {madeLine(state.weather, filters.timezone)}
      </Txt>
    </Animated.View>
  );
}

function HourCell({ hour, unit, timezone }: { hour: WeatherHour; unit: 'C' | 'F'; timezone: string }) {
  const icon = weatherIcon(hour.symbol);
  return (
    <View style={styles.hour}>
      <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
        {hourLabel(hour.at, timezone)}
      </Txt>
      <View style={styles.hourIcon}>{icon && <Icon name={icon} size={18} color={iconColour(icon)} />}</View>
      <Txt variant="footnote" style={face('semibold')}>
        {tempLabel(hour.tempC, unit)}
      </Txt>
    </View>
  );
}

/**
 * The map: a small circle with the symbol and the temperature, under the
 * map's buttons. A tap says it in words, with whose forecast it is.
 */
export function WeatherBadge() {
  const { filters, prefs } = useApp();
  const state = useWeather(filters.centre);
  const [open, setOpen] = useState(false);
  if (state.status !== 'ready') return null;
  const read = reading(state.weather, new Date());
  if (!read) return null;
  const unit = tempUnitFor(prefs.country);
  const words = weatherWords(read.current.symbol);
  const icon = weatherIcon(read.current.symbol);
  const temp = tempLabel(read.current.tempC, unit);
  const where = areaWords(filters.placeName);
  return (
    <View style={styles.badgeWrap}>
      {open && (
        <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)} style={styles.tip} pointerEvents="none">
          <Glass style={styles.tipGlass}>
            <Txt variant="footnote" style={face('semibold')} numberOfLines={1}>
              {`${words ? `${words}, ` : ''}${temp}`}
            </Txt>
            <Txt variant="caption" color={color.label} numberOfLines={2}>
              {`${capital(where)}, now`}
            </Txt>
            <Txt variant="caption" color={color.labelSecondary} numberOfLines={3}>
              {madeLine(state.weather, filters.timezone)}
            </Txt>
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
        accessibilityLabel={`Weather in ${where}: ${temp}${words ? `, ${words.toLowerCase()}` : ''}`}
        accessibilityHint="Says whose forecast it is and when it was made"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Glass style={styles.badge} interactive>
          {icon && <Icon name={icon} size={17} color={iconColour(icon)} />}
          <Txt variant="caption" style={[face('bold'), styles.badgeTemp]} numberOfLines={1}>
            {temp}
          </Txt>
        </Glass>
      </Pressable>
    </View>
  );
}

const BADGE = 46;

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    card: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    now: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    nowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    hours: { flexDirection: 'row', justifyContent: 'space-between' },
    hour: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
    hourIcon: { height: 20, justifyContent: 'center' },
    badgeWrap: { alignItems: 'flex-end' },
    badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: 'center', justifyContent: 'center', gap: 0 },
    badgeTemp: { fontSize: 12, lineHeight: 14 },
    tip: { position: 'absolute', right: BADGE + space[2], top: 0, width: 220 },
    tipGlass: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, gap: 2 },
    pressed: { opacity: 0.7 },
  }),
);
