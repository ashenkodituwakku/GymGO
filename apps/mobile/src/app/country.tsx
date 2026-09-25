/**
 * Your country: the one GymGO Free covers, with every gym in it. Asked for
 * when the app first opens, and changed from Profile. Pro covers every other
 * country too, and there this only sets where the app opens.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { COUNTRIES, FOCUS_COUNTRY, builtInCountries, countryByCode, deviceCountry, flagOf, searchCountries, type Country } from '@/lib/country';
import { haptic } from '@/lib/haptics';
import { CITY_LIST } from '@/lib/places';
import { NO_WEB_OUTLINE, color, face, radius, space, themed } from '@/lib/theme';

/** How many built-in cities each country has. */
const CITY_COUNT = CITY_LIST.filter((city) => !city.demo).reduce<Record<string, number>>((counts, city) => {
  counts[city.country] = (counts[city.country] ?? 0) + 1;
  return counts;
}, {});

export default function CountryScreen() {
  const params = useLocalSearchParams<{ first?: string }>();
  const first = params.first === '1';
  const router = useRouter();
  const { prefs, chooseCountry, billing } = useApp();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  // The device's own region, or GymGO's main market when it doesn't say.
  const suggested = useMemo(() => deviceCountry() ?? FOCUS_COUNTRY, []);

  const sections = useMemo(() => {
    if (query.trim()) return [{ title: '', data: searchCountries(query) }];
    const pick = (codes: Array<string | null | undefined>) =>
      [...new Set(codes)].map((code) => countryByCode(code)).filter((country): country is Country => country !== null);
    const top = pick([prefs.country, suggested]);
    return [
      ...(top.length ? [{ title: prefs.country ? 'Yours' : 'Suggested', data: top }] : []),
      // Less the ones already on top, so the first thing you see isn't there twice.
      { title: 'With cities built in', data: pick(builtInCountries()).filter((country) => !top.includes(country)) },
      { title: 'Every country', data: COUNTRIES },
    ];
  }, [query, prefs.country, suggested]);

  const choose = (code: string) => {
    haptic.success();
    chooseCountry(code);
    if (router.canGoBack()) router.back();
    else router.replace('/explore');
  };

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      sections={sections}
      keyExtractor={(item, index) => `${item.code}-${index}`}
      ListHeaderComponent={
        <View style={styles.header}>
          <Txt variant="title" accessibilityRole="header">
            {first ? 'Where do you train?' : 'Your country'}
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {billing.isPro
              ? 'You have GymGO Pro, so every country is open to you. This sets where GymGO opens.'
              : 'GymGO Free covers one country, with every gym in it. GymGO Pro adds every other country, for when you travel.'}
          </Txt>
          <View style={[styles.search, focused && styles.searchFocused]}>
            <Icon name="search" size={16} color={color.labelSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search countries"
              placeholderTextColor={color.labelTertiary}
              autoCorrect={false}
              autoFocus={!first && Platform.OS === 'web'}
              style={styles.input}
              accessibilityLabel="Search countries"
            />
          </View>
        </View>
      }
      renderSectionHeader={({ section }) =>
        section.title ? (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.sectionTitle}>
            {section.title.toUpperCase()}
          </Txt>
        ) : null
      }
      ListEmptyComponent={
        <Txt variant="subhead" color={color.labelSecondary} style={styles.empty}>
          No country by that name.
        </Txt>
      }
      renderItem={({ item, index, section }) => {
        const on = item.code === prefs.country;
        const cities = CITY_COUNT[item.code] ?? 0;
        const detail = cities > 0 ? `${cities} ${cities === 1 ? 'city' : 'cities'} built in` : item.capital ? `Opens on ${item.capital}` : 'Search it on the map';
        return (
          <Pressable
            onPress={() => choose(item.code)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}${on ? ', your country' : ''}`}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              styles.row,
              index === 0 && styles.rowFirst,
              index === section.data.length - 1 && styles.rowLast,
              pressed && { backgroundColor: color.fill },
            ]}
          >
            {/* Windows draws flag emoji as two letters, so the browser shows the code instead. */}
            {Platform.OS === 'web' ? (
              <View style={styles.code}>
                <Txt variant="caption" color={color.brand} style={face('semibold')}>
                  {item.code}
                </Txt>
              </View>
            ) : (
              <Txt variant="title2" style={styles.flag}>
                {flagOf(item.code)}
              </Txt>
            )}
            <View style={styles.flex}>
              <Txt variant="body">{item.name}</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {detail}
              </Txt>
            </View>
            {on && <Icon name="check" size={18} color={color.brand} />}
          </Pressable>
        );
      }}
    />
  );
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: space[2], marginBottom: space[2] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[2],
    paddingHorizontal: space[3],
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.fill,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  // The field's own focus ring, in the accent, instead of the browser's box.
  searchFocused: { borderColor: color.brand },
  input: { flex: 1, fontSize: 17, color: color.label, ...NO_WEB_OUTLINE, ...face('regular') },
  sectionTitle: { marginTop: space[5], marginBottom: space[2], marginLeft: space[4], letterSpacing: 0.4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: color.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.separator,
  },
  rowFirst: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  rowLast: { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, borderBottomWidth: 0 },
  flag: { width: 32, textAlign: 'center' },
  code: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.brandTint,
  },
  flex: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: space[6] },
}));
