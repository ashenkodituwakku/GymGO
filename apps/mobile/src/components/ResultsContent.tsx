/**
 * What lives in the main sheet: search, quick filters, and the results.
 *
 * Mirrors Apple Maps, where the search field sits at the top of the sheet
 * rather than over the map, so the map is never covered by more than it needs.
 */

import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { explainNoMatches, haversineKm, type GymRecord, type SearchOutcome } from '@gymgo/domain';
import { suggestGyms } from '@/lib/gymSearch';
import { cityAt, distanceLabel, moneyLabel, placeContext, suggestPlaces, type AppPlace } from '@/lib/places';
import { EMPTY, PLACEHOLDER, TIER, sessionGreeting, summaryLine, timeLabel } from '@/lib/copy';
import { SORTS, activeFilterCount, type Filters } from '@/lib/query';
import { color, face, radius, space } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { GymRow } from './GymRow';
import { Icon } from './Icon';
import { Chip, TIER_COLOUR, Txt } from './ui';

/** A critically-damped spring: rows glide to their new place, no bounce. */
const GLIDE = LinearTransition.springify().damping(26).stiffness(260);

export function ResultsContent({
  outcome,
  filters,
  query,
  onQueryChange,
  onSearchFocus,
  onPickPlace,
  onSubmitSearch,
  onToggleEquipment,
  onToggleBudget,
  onOpenFilters,
  onSelect,
  records,
  onApplyRelaxation,
  notice,
  inSheet,
  accountInitial,
  onOpenAccount,
  dataNote,
  covers,
  memberPrices,
  searchRef,
  onSort,
}: {
  outcome: SearchOutcome;
  filters: Filters;
  query: string;
  onQueryChange: (text: string) => void;
  onSearchFocus: () => void;
  onPickPlace: (place: AppPlace) => void;
  onSubmitSearch: () => void;
  onToggleEquipment: (id: string) => void;
  onToggleBudget: () => void;
  onOpenFilters: () => void;
  onSelect: (id: string) => void;
  /** The gyms that can be searched by name (the current mode's). */
  records: readonly GymRecord[];
  onApplyRelaxation: (index: number) => void;
  notice: string | null;
  /** In a bottom sheet (phone) or a plain panel (desktop). */
  inSheet: boolean;
  /** The signed-in person's initial, or null when signed out. */
  accountInitial: string | null;
  onOpenAccount: () => void;
  /** The line at the foot of the list about where the data comes from. */
  dataNote: string;
  /** Each gym's newest member photo, by gym ID. */
  covers: Record<string, string>;
  /** What members typically paid, by gym. */
  memberPrices: Record<string, { typicalMinor: number }>;
  /** So other tabs can put the cursor in the search box. */
  searchRef?: React.RefObject<TextInput | null>;
  /** Choose how the list is ordered. */
  onSort: () => void;
}) {
  // The sheet-aware input throws in a browser; see TextField in ui.tsx.
  const SearchInput = inSheet && Platform.OS !== 'web' ? BottomSheetTextInput : TextInput;
  const city = cityAt(filters.centre);
  const suggestions = query.trim() ? suggestPlaces(query, 6, city.id) : [];
  // Gyms by name too ("Equinox", "snap fit"), nearest first, after places.
  const gymSuggestions = query.trim() ? suggestGyms(query, records, filters.centre, 4) : [];
  const filterCount = activeFilterCount(filters);
  const total = outcome.results.length;

  return (
    <View style={styles.wrap}>
      {/* Search --------------------------------------------------------- */}
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Icon name="search" size={16} color={color.labelSecondary} />
          <SearchInput
            ref={searchRef as never}
            value={query}
            onChangeText={onQueryChange}
            onFocus={onSearchFocus}
            onSubmitEditing={onSubmitSearch}
            placeholder={PLACEHOLDER}
            placeholderTextColor={color.labelTertiary}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Search a suburb, city or gym"
          />
        </View>
        <Pressable
          onPress={() => {
            haptic.tap();
            onOpenFilters();
          }}
          accessibilityRole="button"
          accessibilityLabel={filterCount ? `Filters, ${filterCount} on` : 'Filters'}
          style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.7 }]}
        >
          <Icon name="filters" size={17} color={color.brand} />
          {filterCount > 0 && (
            <View style={styles.badge}>
              <Txt variant="caption" color={color.onBrand} style={styles.badgeText}>
                {filterCount}
              </Txt>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            haptic.tap();
            onOpenAccount();
          }}
          accessibilityRole="button"
          accessibilityLabel={accountInitial ? 'Your account' : 'Sign in'}
          style={({ pressed }) => [styles.avatar, accountInitial ? styles.avatarSignedIn : null, pressed && { opacity: 0.7 }]}
        >
          {accountInitial ? (
            <Txt variant="headline" color={color.onBrand}>
              {accountInitial}
            </Txt>
          ) : (
            <Icon name="account" size={22} color={color.brand} />
          )}
        </Pressable>
      </View>

      {(suggestions.length > 0 || gymSuggestions.length > 0) && (
        <View style={styles.suggestions}>
          {suggestions.map((place) => (
            <Pressable
              key={`${place.city}-${place.name}`}
              onPress={() => {
                haptic.select();
                onPickPlace(place);
              }}
              style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: color.fill }]}
              accessibilityRole="button"
            >
              <View style={styles.suggestionGlyph}>
                <Icon name="pin" size={16} color={color.onBrand} />
              </View>
              <Txt variant="body">{place.name}</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {placeContext(place)}
                {place.city === 'sydney-demo' ? ' · invented demo' : ''}
              </Txt>
            </Pressable>
          ))}
          {gymSuggestions.map((record) => {
            const location = record.location;
            return (
              <Pressable
                key={location.id}
                onPress={() => {
                  haptic.select();
                  onSelect(location.id);
                }}
                style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: color.fill }]}
                accessibilityRole="button"
                accessibilityLabel={`${location.name}, gym in ${location.address.suburb}`}
              >
                <View style={[styles.suggestionGlyph, styles.gymGlyph]}>
                  <Icon name="gym" size={16} color={color.onBrand} />
                </View>
                <Txt variant="body">
                  {location.name}
                  {location.branch ? ` ${location.branch}` : ''}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  Gym · {location.address.suburb} · {distanceLabel(haversineKm(filters.centre, location.position), location.address.countryCode)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Quick filters -------------------------------------------------- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          icon="sort"
          label={SORTS.find((item) => item.key === filters.sort)?.label ?? 'Best match'}
          selected={filters.sort !== 'best_match'}
          onPress={onSort}
          accessibilityLabel={`Sorted by ${SORTS.find((item) => item.key === filters.sort)?.label ?? 'best match'}. Change`}
        />
        <Chip
          icon="clock"
          label={timeLabel(filters.visitMinuteOfDay)}
          selected={false}
          onPress={onOpenFilters}
          accessibilityLabel={`Visiting at ${timeLabel(filters.visitMinuteOfDay)}. Change time`}
        />
        <Chip
          label={`Under ${moneyLabel(3000, city.country)}`}
          selected={filters.budgetMinor === 3000}
          onPress={onToggleBudget}
        />
        <Chip label="Squat rack" selected={filters.equipment.includes('squat_rack')} onPress={() => onToggleEquipment('squat_rack')} />
        <Chip label="Dumbbells" selected={filters.equipment.includes('dumbbells')} onPress={() => onToggleEquipment('dumbbells')} />
        <Chip label="Cables" selected={filters.equipment.includes('cable_station')} onPress={() => onToggleEquipment('cable_station')} />
        <Chip label="Platform" selected={filters.equipment.includes('lifting_platform')} onPress={() => onToggleEquipment('lifting_platform')} />
      </ScrollView>

      {/* Summary -------------------------------------------------------- */}
      <View style={styles.summary}>
        <Txt variant="eyebrow" color={color.brand} style={styles.greeting}>
          {sessionGreeting(filters.visitMinuteOfDay).toUpperCase()}
        </Txt>
        <Txt variant="title2">
          {filters.placeName === 'your location' ? 'Near you' : `Near ${filters.placeName}`}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          {summaryLine(total, outcome.counts.confirmed, filters.visitMinuteOfDay)}
        </Txt>
      </View>

      {notice && (
        <View style={styles.notice}>
          <Icon name="info" size={16} color={color.brand} />
          <Txt variant="footnote" style={styles.noticeText}>
            {notice}
          </Txt>
        </View>
      )}

      {/* Nothing is a sure thing ------------------------------------------ */}
      {total > 0 && outcome.counts.confirmed === 0 && filterCount === 0 && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.hint}>
          {EMPTY.unconfirmedLine}
        </Txt>
      )}
      {total > 0 && outcome.counts.confirmed === 0 && filterCount > 0 && (
        <View style={styles.explain}>
          <Txt variant="headline">{EMPTY.results}</Txt>
          {explainNoMatches(outcome)
            .slice(0, 2)
            .map((line) => (
              <Txt key={line} variant="footnote" color={color.labelSecondary} style={styles.explainLine}>
                {line}
              </Txt>
            ))}
          {outcome.relaxations.length > 0 && (
            <View style={styles.relaxations}>
              {outcome.relaxations.map((relaxation, index) => (
                <Chip
                  key={relaxation.label}
                  icon="sparkle"
                  label={`${relaxation.label} (${relaxation.confirmedCount})`}
                  selected={false}
                  onPress={() => onApplyRelaxation(index)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Results: one list, best first; the ones that don't fit sit apart. */}
      {[
        { key: 'fits', title: null, list: outcome.results.filter((result) => result.tier !== 'ruled_out') },
        { key: 'misses', title: TIER.ruled_out.label, list: outcome.results.filter((result) => result.tier === 'ruled_out') },
      ].map((group) =>
        group.list.length === 0 ? null : (
          <Animated.View key={group.key} style={styles.group} entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)} layout={GLIDE}>
            {group.title && (
              <View style={styles.groupHeader}>
                <Txt variant="headline" color={TIER_COLOUR.ruled_out.ink}>
                  {group.title}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {group.list.length}
                </Txt>
              </View>
            )}
            <View style={styles.list}>
              {group.list.map((result, index) => (
                <Animated.View
                  key={result.record.location.id}
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(120)}
                  layout={GLIDE}
                >
                  {index > 0 && <View style={styles.rowDivider} />}
                  <GymRow
                    result={result}
                    visitMinute={filters.visitMinuteOfDay}
                    cover={covers[result.record.location.id] ?? null}
                    memberTypicalMinor={memberPrices[result.record.location.id]?.typicalMinor ?? null}
                    onPress={() => onSelect(result.record.location.id)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ),
      )}

      <View style={styles.footer}>
        <Txt variant="caption" color={color.labelSecondary} style={styles.footerText}>
          {dataNote}
          {'\n'}
          {EMPTY.crowd}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space[8] },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[1],
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 40,
    paddingHorizontal: space[3],
    // iOS 26 search fields are capsules.
    borderRadius: radius.pill,
    backgroundColor: color.fill,
  },
  input: {
    flex: 1,
    fontSize: 17,
    ...face('regular'),
    color: color.label,
    paddingVertical: 0,
    height: 40,
    // The web preview's focus ring; phones draw none.
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymGlyph: { backgroundColor: color.brand },
  avatarSignedIn: { backgroundColor: color.brand },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { fontSize: 10, lineHeight: 12, ...face('bold') },

  suggestions: { paddingHorizontal: space[2], paddingTop: space[2] },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  suggestionGlyph: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chips: { gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },

  summary: { paddingHorizontal: space[4], paddingTop: space[1], gap: 2 },
  greeting: { marginBottom: 2 },

  notice: {
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'flex-start',
    marginHorizontal: space[4],
    marginTop: space[3],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.brandTint,
  },
  noticeText: { flex: 1 },

  explain: {
    marginHorizontal: space[4],
    marginTop: space[4],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.maybeTint,
    gap: space[1],
  },
  explainLine: { marginTop: 2 },
  hint: { paddingHorizontal: space[4], marginTop: space[1] },
  relaxations: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] },

  group: { marginTop: space[4] },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    marginBottom: space[2],
  },
  list: {
    marginHorizontal: space[4],
    // Concentric with the sheet's corners, and a little translucent so the
    // glass reads through at the edges.
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    overflow: 'hidden',
  },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: 86 },

  footer: { paddingHorizontal: space[6], paddingTop: space[6] },
  footerText: { textAlign: 'center' },
});
