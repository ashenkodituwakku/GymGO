/**
 * What lives in the main sheet: search, quick filters, and the results.
 *
 * Mirrors Apple Maps, where the search field sits at the top of the sheet
 * rather than over the map, so the map is never covered by more than it needs.
 */

import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { explainNoMatches, type ResultTier, type SearchOutcome } from '@gymgo/domain';
import { suggestPlaces, type Place } from '@gymgo/demo-data';
import { EMPTY, PLACEHOLDER, TIER, sessionGreeting, summaryLine, timeLabel } from '@/lib/copy';
import { activeFilterCount, type Filters } from '@/lib/query';
import { color, face, radius, space } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { GymRow } from './GymRow';
import { Icon } from './Icon';
import { Chip, TIER_COLOUR, Txt } from './ui';

const TIER_ORDER: ResultTier[] = ['confirmed', 'needs_confirmation', 'ruled_out'];

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
  onApplyRelaxation,
  notice,
}: {
  outcome: SearchOutcome;
  filters: Filters;
  query: string;
  onQueryChange: (text: string) => void;
  onSearchFocus: () => void;
  onPickPlace: (place: Place) => void;
  onSubmitSearch: () => void;
  onToggleEquipment: (id: string) => void;
  onToggleBudget: () => void;
  onOpenFilters: () => void;
  onSelect: (id: string) => void;
  onApplyRelaxation: (index: number) => void;
  notice: string | null;
}) {
  const suggestions = query.trim() ? suggestPlaces(query) : [];
  const filterCount = activeFilterCount(filters);
  const total = outcome.results.length;

  return (
    <View style={styles.wrap}>
      {/* Search --------------------------------------------------------- */}
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Icon name="search" size={16} color={color.labelSecondary} />
          <BottomSheetTextInput
            value={query}
            onChangeText={onQueryChange}
            onFocus={onSearchFocus}
            onSubmitEditing={onSubmitSearch}
            placeholder={PLACEHOLDER}
            placeholderTextColor={color.labelTertiary}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Search a suburb or postcode"
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
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((place) => (
            <Pressable
              key={place.name}
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
                {place.postcode}
              </Txt>
            </Pressable>
          ))}
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
          icon="clock"
          label={timeLabel(filters.visitMinuteOfDay)}
          selected={false}
          onPress={onOpenFilters}
          accessibilityLabel={`Visiting at ${timeLabel(filters.visitMinuteOfDay)}. Change time`}
        />
        <Chip
          label="Under A$30"
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

      {/* Nothing fits --------------------------------------------------- */}
      {total > 0 && outcome.counts.confirmed === 0 && (
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

      {/* Results -------------------------------------------------------- */}
      {TIER_ORDER.map((tier) => {
        const group = outcome.results.filter((result) => result.tier === tier);
        if (group.length === 0) return null;
        const tone = TIER_COLOUR[tier];
        return (
          <Animated.View
            key={tier}
            style={styles.group}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(140)}
            layout={GLIDE}
          >
            <View style={styles.groupHeader}>
              <View style={[styles.dot, { backgroundColor: tone.fill }]} />
              <Txt variant="headline" color={tone.ink}>
                {TIER[tier].label}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {group.length}
              </Txt>
            </View>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.groupLine}>
              {TIER[tier].line}
            </Txt>
            <View style={styles.list}>
              {group.map((result, index) => (
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
                    onPress={() => onSelect(result.record.location.id)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        );
      })}

      <View style={styles.footer}>
        <Txt variant="caption" color={color.labelTertiary} style={styles.footerText}>
          Demo data — every gym here is invented for testing.{'\n'}
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
    borderRadius: radius.sm,
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
  relaxations: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] },

  group: { marginTop: space[5] },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  groupLine: { paddingHorizontal: space[4], marginTop: 2, marginBottom: space[2] },
  list: {
    marginHorizontal: space[3],
    borderRadius: radius.lg,
    backgroundColor: color.card,
    overflow: 'hidden',
  },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: 72 },

  footer: { paddingHorizontal: space[6], paddingTop: space[6] },
  footerText: { textAlign: 'center' },
});
