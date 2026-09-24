/**
 * A gym's place card: photos, one row of actions, one clear answer, three
 * quick facts, then the detail folded away until you want it.
 *
 * Everything the card says comes from the same evaluation that coloured the
 * pin and placed the row, so the three can never disagree.
 */

import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  EQUIPMENT_TYPES,
  assessAllOffers,
  describeMembership,
  equipmentLabel,
  formatDistanceKm,
  formatMoney,
  isMultiVisitProduct,
  productTypeLabel,
  summariseWeek,
  type AccessSchedule,
  type GymSearchResult,
  type Provenance,
  type Tri,
} from '@gymgo/domain';
import { TIER, accessLine, checkedAgo, ratingShort, sourceLabel } from '@/lib/copy';
import { depositLine, priceLine } from '@/lib/present';
import { color, face, radius, space } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { Icon } from './Icon';
import { StateGlyphRow } from './StateGlyphRow';
import { Glass } from './Glass';
import { ActionButton, CloseButton, Fold, TIER_COLOUR, Txt } from './ui';

const TRAINING: Record<string, string> = {
  full_gym: 'Gym',
  strength_focused: 'Strength gym',
  functional: 'Functional',
  aquatic_centre: 'Aquatic centre',
  studio: 'Studio',
  crossfit_box: 'CrossFit box',
};

/**
 * The name and close button. Separate from the card so the sheet can pin it
 * while the detail scrolls under it, as Maps does.
 *
 * It is clear while the card is at rest, so the glass sheet shows through
 * unbroken. A frosted strip fades in only once content scrolls beneath it:
 * iOS 26's scroll-edge effect.
 */
export function PlaceHeader({
  result,
  onClose,
  scrolled,
  topPadding = 0,
}: {
  result: GymSearchResult;
  onClose: () => void;
  scrolled: boolean;
  /** Extra space above the name, inside the frosted strip. */
  topPadding?: number;
}) {
  const location = result.record.location;
  const subtitle = [
    TRAINING[location.trainingTypes[0] ?? 'full_gym'] ?? 'Gym',
    location.address.suburb,
    result.distanceKm !== null ? formatDistanceKm(result.distanceKm).replace(' straight line', '') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.headerBar, { paddingTop: topPadding }]}>
      {scrolled && <Glass kind="bar" style={StyleSheet.absoluteFill} />}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Txt variant="title" numberOfLines={2}>
            {location.name}
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {subtitle}
          </Txt>
        </View>
        <CloseButton onPress={onClose} />
      </View>
    </View>
  );
}

export function PlaceCard({
  result,
  visitMinute,
  visitDate,
  saved,
  onToggleSave,
  onOpenGoogle,
  asOf,
  photos,
  memberKit,
  reviews,
}: {
  result: GymSearchResult;
  visitMinute: number;
  visitDate: string;
  saved: boolean;
  onToggleSave: () => void;
  /** The live Google Maps page for this gym (its own screen, away from our map). */
  onOpenGoogle: () => void;
  asOf: Date;
  /** Members' photos across the top, which need the account and the server. */
  photos: React.ReactNode;
  /** What members say the gym has, likewise. */
  memberKit: React.ReactNode;
  /** The live reviews section, likewise. */
  reviews: React.ReactNode;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const record = result.record;
  const location = record.location;
  const tone = TIER_COLOUR[result.tier];
  const tier = TIER[result.tier];
  const price = priceLine(result.offers);
  const deposit = depositLine(result.offers);

  const offers = assessAllOffers(record.offers, { visitLocalDate: visitDate, asOf });
  const longer = record.offers.filter((offer) => isMultiVisitProduct(offer) || offer.productType === 'membership');
  const reasons = result.limitations.slice(0, 3);
  const kit = record.equipment.filter((item) => item.presence === 'yes');
  const guestHours = result.access.visitorSchedule ? summariseWeek(result.access.visitorSchedule)[0] : null;
  const sources = sourcesOf(record);

  // Demo listings have invented addresses and numbers. Say so, rather than
  // opening a map to nowhere or dialling a stranger.
  const demo = (what: string) => () => setNotice(`Demo listing — ${what}`);

  // Real listings hand off to the platform: Apple Maps on iPhone, the
  // system's maps app on Android, the dialler, and an in-app browser.
  const { lat, lng } = location.position;
  const directions = () => {
    const label = encodeURIComponent(location.name);
    const url = Platform.select({
      ios: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    void Linking.openURL(url).catch(() => setNotice("Couldn't open a maps app on this device."));
  };
  const call = () => {
    if (!location.phone) return setNotice('No phone number on record for this gym.');
    void Linking.openURL(`tel:${location.phone.replace(/\s+/g, '')}`).catch(() =>
      setNotice("This device can't make calls."),
    );
  };
  const website = () => {
    if (!location.website) return setNotice('No website on record for this gym.');
    void WebBrowser.openBrowserAsync(location.website);
  };

  return (
    <View style={styles.wrap}>
      {photos}

      {/* Actions -------------------------------------------------------- */}
      <View style={styles.actions}>
        <ActionButton
          icon="directions"
          label="Go"
          primary
          onPress={location.isDemoData ? demo("this gym doesn't exist, so there's nowhere to route to.") : directions}
        />
        <ActionButton
          icon="call"
          label="Call"
          onPress={location.isDemoData ? demo("that number isn't real, so we haven't dialled it.") : call}
        />
        <ActionButton
          icon="website"
          label="Website"
          onPress={location.isDemoData ? demo("there's no real website to open.") : website}
        />
        <ActionButton
          icon={saved ? 'saved' : 'save'}
          label={saved ? 'Saved' : 'Save'}
          onPress={() => {
            if (!saved) haptic.success();
            onToggleSave();
          }}
        />
      </View>

      {notice && (
        <View style={styles.notice}>
          <Icon name="info" size={15} color={color.brand} />
          <Txt variant="footnote" style={styles.flex}>
            {notice}
          </Txt>
        </View>
      )}

      {/* The one answer ------------------------------------------------- */}
      <View style={[styles.verdict, { backgroundColor: tone.tint }]}>
        <View style={styles.verdictHead}>
          <Txt style={styles.verdictEmoji}>{tier.emoji}</Txt>
          <View style={styles.flex}>
            <Txt variant="title2" color={tone.ink}>
              {tier.label}
            </Txt>
            <Txt variant="subhead" color={color.label}>
              {accessLine(result.access.verdict, visitMinute)}
            </Txt>
          </View>
        </View>
        {reasons.length > 0 && (
          <View style={styles.reasons}>
            {reasons.map((reason, index) => (
              <View key={`${reason.code}-${index}`} style={styles.reason}>
                <View style={[styles.bullet, { backgroundColor: tone.fill }]} />
                <Txt variant="footnote" color={color.label} style={styles.flex}>
                  {reason.message}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* At a glance ---------------------------------------------------- */}
      <View style={styles.facts}>
        <Fact emoji="💵" value={price.headline} caption={price.caption} tint={price.confirmed ? color.label : color.maybeInk} />
        <Fact
          emoji="⭐"
          value={result.rating.average === null ? 'New' : result.rating.average.toFixed(1)}
          caption={result.rating.count ? `${result.rating.count} review${result.rating.count === 1 ? '' : 's'}` : 'no reviews yet'}
          tint={color.label}
        />
        <Fact emoji="🏋️" value={kit.length ? String(kit.length) : '?'} caption={kit.length ? 'kinds of kit' : 'kit unlisted'} tint={kit.length ? color.label : color.maybeInk} />
      </View>

      {!location.isDemoData && (
        <Pressable
          onPress={() => {
            haptic.select();
            onOpenGoogle();
          }}
          accessibilityRole="button"
          accessibilityLabel="See this gym on Google Maps"
          style={({ pressed }) => [styles.google, pressed && { opacity: 0.75 }]}
        >
          <Txt style={styles.googleEmoji}>🔎</Txt>
          <View style={styles.flex}>
            <Txt variant="headline">See it on Google</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              Google’s rating, reviews and photos, free
            </Txt>
          </View>
          <Icon name="chevron" size={14} color={color.labelTertiary} />
        </Pressable>
      )}

      {/* The detail, folded away ---------------------------------------- */}
      <View style={styles.folds}>
        <Fold emoji="💵" title="Prices" summary={price.headline === '—' ? 'Not published' : `${price.headline} · ${price.caption}`}>
          {offers
            .filter((assessment) => !isMultiVisitProduct(assessment.offer) && assessment.offer.productType !== 'membership')
            .map((assessment) => {
              const cost = assessment.cost;
              const total = cost.known && cost.totalNonRefundableMinor !== null ? formatMoney(cost.totalNonRefundableMinor) : 'Ask';
              const blocked = assessment.reasons.find((reason) => reason.severity === 'blocking');
              return (
                <View key={assessment.offer.id} style={styles.offer}>
                  <View style={styles.offerHead}>
                    <View style={styles.flex}>
                      <Txt variant="headline">{assessment.offer.label}</Txt>
                      <Txt variant="footnote" color={color.labelSecondary}>
                        {productTypeLabel(assessment.offer.productType)}
                      </Txt>
                    </View>
                    <Txt variant="figure" color={blocked ? color.labelSecondary : color.label}>
                      {total}
                    </Txt>
                  </View>
                  {!cost.known && (
                    <Txt variant="footnote" color={color.maybeInk}>
                      {cost.unknownReasons.join(' ')}
                    </Txt>
                  )}
                  {blocked && (
                    <Txt variant="footnote" color={color.noInk}>
                      {blocked.message}
                    </Txt>
                  )}
                </View>
              );
            })}
          {record.offers.length === 0 && (
            <Txt variant="subhead" color={color.labelSecondary}>
              This gym doesn’t publish a visit price, so we don’t show one. Ask when you call.
            </Txt>
          )}
          {deposit && (
            <Txt variant="footnote" color={color.labelSecondary}>
              {deposit}
            </Txt>
          )}
          {longer.length > 0 && (
            <View style={styles.longer}>
              {longer.map((offer) => {
                const membership = describeMembership(offer);
                return (
                  <Txt key={offer.id} variant="footnote" color={color.labelSecondary}>
                    {offer.label}: {offer.baseAmountMinor === null ? 'price unconfirmed' : formatMoney(offer.baseAmountMinor)}
                    {membership
                      ? ` ${membership.billingLabel} · ${membership.minimumTermLabel.toLowerCase()}`
                      : offer.validityDays
                        ? ` for ${offer.validityDays} days`
                        : ''}
                  </Txt>
                );
              })}
            </View>
          )}
          <Evidence provenance={result.offers.bestAvailable?.offer.provenance} age={result.offers.bestAvailable?.freshness.ageDays ?? null} />
        </Fold>

        <Fold emoji="🚪" title="Getting in" summary={guestHours ? `Guests ${guestHours}` : 'Guest hours not published'}>
          <Hours label="Guests" schedule={result.access.visitorSchedule} highlight />
          <Hours label="Front desk" schedule={result.access.staffedSchedule} />
          <Hours label="Members" schedule={result.access.memberSchedule} />
          <View style={styles.prereqs}>
            <Prereq label="Book ahead" value={record.prerequisites.advanceBookingRequired} />
            <Prereq label="Induction first visit" value={record.prerequisites.inductionRequired} />
            <Prereq label="Photo ID" value={record.prerequisites.photoIdRequired} />
            <Prereq label="Member signs you in" value={record.prerequisites.memberAccompanimentRequired} />
          </View>
          {record.prerequisites.notes.length > 0 && (
            <View style={styles.notes}>
              {record.prerequisites.notes.map((note) => (
                <Txt key={note} variant="footnote" color={color.labelSecondary}>
                  • {note}
                </Txt>
              ))}
            </View>
          )}
          <Evidence provenance={record.prerequisites.provenance} />
        </Fold>

        <Fold
          emoji="🏋️"
          title="Equipment"
          summary={
            kit.length
              ? kit.slice(0, 3).map((item) => equipmentLabel(item.equipmentTypeId)).join(', ') + (kit.length > 3 ? '…' : '')
              : 'Not published by the gym · see what members say'
          }
          initiallyOpen={result.equipment.matches.length > 0}
        >
          {result.equipment.matches.length > 0 && (
            <View style={styles.kitAsked}>
              {result.equipment.matches.map((match) => (
                <StateGlyphRow
                  key={match.requirement.equipmentTypeId}
                  state={match.state}
                  label={`${equipmentLabel(match.requirement.equipmentTypeId)}${match.requirement.minMaxWeightKg ? ` ${match.requirement.minMaxWeightKg} kg+` : ''}`}
                  detail={match.detail}
                />
              ))}
            </View>
          )}
          <View style={styles.kitGrid}>
            {EQUIPMENT_TYPES.map((type) => {
              const observation = kit.find((item) => item.equipmentTypeId === type.id);
              if (!observation) return null;
              const extra =
                observation.maxWeightKg !== null ? `to ${observation.maxWeightKg} kg` : observation.count !== null ? `×${observation.count}` : null;
              return (
                <View key={type.id} style={styles.kitChip}>
                  <Txt variant="footnote">{type.label}</Txt>
                  {extra && (
                    <Txt variant="footnote" color={color.labelSecondary}>
                      {extra}
                    </Txt>
                  )}
                </View>
              );
            })}
          </View>
          {kit.length === 0 && (
            <Txt variant="subhead" color={color.labelSecondary}>
              The gym doesn’t publish its equipment, so GymGO doesn’t claim any.
            </Txt>
          )}
          {record.equipment[0] && <Evidence provenance={record.equipment[0].provenance} />}
          {memberKit}
        </Fold>

        <Fold
          emoji="⭐"
          title="Reviews"
          summary={result.rating.count ? `${ratingShort(result.rating.average)} from ${result.rating.count}` : 'None yet — be the first'}
        >
          {reviews}
        </Fold>

        {sources.length > 0 && (
          <Fold emoji="📚" title="Where this comes from" summary={`${sources.length} source${sources.length === 1 ? '' : 's'}, all linked`}>
            <Sources sources={sources} />
          </Fold>
        )}
      </View>

      {location.isDemoData && (
        <Txt variant="caption" color={color.labelTertiary} style={styles.demo}>
          Demo listing. This gym, its prices and its hours are invented for testing.
        </Txt>
      )}
    </View>
  );
}

function Fact({ emoji, value, caption, tint }: { emoji: string; value: string; caption: string; tint: string }) {
  return (
    <View style={styles.fact}>
      <Txt style={styles.factEmoji}>{emoji}</Txt>
      <Txt variant="figure" color={tint} numberOfLines={1}>
        {value}
      </Txt>
      <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
        {caption}
      </Txt>
    </View>
  );
}

function Hours({ label, schedule, highlight = false }: { label: string; schedule: AccessSchedule | null; highlight?: boolean }) {
  const lines = schedule ? summariseWeek(schedule) : ['Not confirmed'];
  return (
    <View style={styles.hours}>
      <Txt variant="subhead" color={highlight ? color.label : color.labelSecondary} style={[styles.hoursLabel, highlight && styles.bold]}>
        {label}
      </Txt>
      <View style={styles.flex}>
        {lines.map((line) => (
          <Txt key={line} variant="subhead" color={highlight ? color.label : color.labelSecondary}>
            {line}
          </Txt>
        ))}
      </View>
    </View>
  );
}

function Prereq({ label, value }: { label: string; value: Tri }) {
  const text = value === 'yes' ? 'Yes' : value === 'no' ? 'No' : 'Not known';
  const ink = value === 'unknown' ? color.maybeInk : color.label;
  return (
    <View style={styles.prereq}>
      <Txt variant="footnote" color={color.labelSecondary}>
        {label}
      </Txt>
      <Txt variant="footnote" color={ink} style={styles.bold}>
        {text}
      </Txt>
    </View>
  );
}

/** One line saying where a fact came from and when, linking to the page. */
function Evidence({ provenance, age }: { provenance: Provenance | undefined; age?: number | null }) {
  if (!provenance || provenance.status === 'unknown') return null;
  const first = provenance.sources[0];
  const ageDays = age ?? (first ? Math.max(0, Math.floor((Date.now() - Date.parse(first.checkedAt)) / 86_400_000)) : null);
  const text = `${first?.label ?? sourceLabel(provenance.status)} · ${checkedAgo(ageDays)}`;
  const url = first?.evidenceRef?.startsWith('https://') ? first.evidenceRef : null;
  if (!url) {
    return (
      <Txt variant="caption" color={color.labelTertiary}>
        {text}
      </Txt>
    );
  }
  return (
    <Pressable onPress={() => void WebBrowser.openBrowserAsync(url)} accessibilityRole="link" hitSlop={6}>
      <Txt variant="caption" color={color.brand}>
        {text} ↗
      </Txt>
    </Pressable>
  );
}

type Source = GymSearchResult['record']['location']['provenance']['sources'][number];

/**
 * Every source behind this listing, once each. For real gyms that is the
 * operator's own pages and OpenStreetMap, whose licence asks for the credit.
 */
function sourcesOf(record: GymSearchResult['record']): Source[] {
  if (record.location.isDemoData) return [];
  const all = [
    record.location.provenance,
    record.prerequisites.provenance,
    ...record.schedules.map((item) => item.provenance),
    ...record.offers.map((item) => item.provenance),
    ...record.equipment.map((item) => item.provenance),
  ].flatMap((provenance) => provenance.sources);
  return [...new Map(all.filter((source) => source.evidenceRef).map((source) => [source.evidenceRef, source])).values()];
}

function Sources({ sources }: { sources: Source[] }) {
  return (
    <View>
      {sources.map((source) => (
        <Pressable
          key={source.evidenceRef}
          onPress={() => void WebBrowser.openBrowserAsync(source.evidenceRef!)}
          accessibilityRole="link"
          style={styles.sourceRow}
        >
          <Txt variant="subhead" color={color.brand} style={styles.flex}>
            {source.label}
          </Txt>
          <Txt variant="caption" color={color.labelTertiary}>
            Read {new Date(source.checkedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </Txt>
        </Pressable>
      ))}
      <Txt variant="caption" color={color.labelTertiary} style={styles.sourceNote}>
        Anything not listed by the gym is marked unknown, not guessed. Map data © OpenStreetMap contributors, ODbL.
        Nothing here was supplied by the gym.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space[4], paddingBottom: space[8] },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  bold: face('bold'),

  headerBar: {
    paddingHorizontal: space[4],
    paddingBottom: space[2],
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingTop: space[1] },
  headerText: { flex: 1, gap: 2 },

  actions: { flexDirection: 'row', gap: space[2], marginTop: space[2] },

  notice: {
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'flex-start',
    marginTop: space[3],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.brandTint,
  },

  verdict: { marginTop: space[4], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', gap: space[3] },
  verdictHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  verdictEmoji: { fontSize: 34, lineHeight: 42 },
  reasons: { gap: space[2] },
  reason: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },

  facts: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  fact: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    paddingVertical: space[3],
    paddingHorizontal: space[1],
    borderRadius: radius.lg + 4,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  factEmoji: { fontSize: 20, lineHeight: 26 },

  google: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg + 4,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  googleEmoji: { fontSize: 22, lineHeight: 28, width: 30, textAlign: 'center' },

  folds: { gap: space[2], marginTop: space[4] },

  offer: { gap: 4 },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  longer: { gap: 4, paddingTop: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.separator },

  hours: { flexDirection: 'row', gap: space[3] },
  hoursLabel: { width: 84 },
  prereqs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.separator,
  },
  prereq: {
    width: '48%',
    padding: space[2],
    borderRadius: radius.sm,
    backgroundColor: color.groupedBackground,
    gap: 1,
  },

  kitAsked: { gap: space[2], paddingBottom: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
  kitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  kitChip: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.groupedBackground,
  },

  demo: { textAlign: 'center', marginTop: space[6] },
  notes: { gap: 4, marginTop: space[3] },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[2] },
  sourceNote: { marginTop: space[2] },
});
