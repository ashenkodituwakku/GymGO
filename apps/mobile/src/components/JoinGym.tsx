/**
 * "Join this gym" on a gym's card: what signing up costs, where the gym
 * publishes it, and a way to its own sign-up page.
 *
 * GymGO doesn't sell memberships: joining happens with the gym itself, on
 * its site or at its desk. Every price shown carries its source and when it
 * was read; a fee the gym doesn't publish says "not published", never $0.
 */

import * as WebBrowser from 'expo-web-browser';
import { Linking, StyleSheet, View } from 'react-native';
import { describeMembership, formatMoney, type GymRecord, type VisitOffer } from '@gymgo/domain';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Fold, PrimaryButton, Txt } from './ui';
import { Pressy } from './motion';

/** The membership offers a gym publishes, cheapest per week first. */
export function membershipsOf(record: GymRecord): VisitOffer[] {
  const weekly = (offer: VisitOffer) => describeMembership(offer)?.effectiveWeeklyMinor ?? Number.POSITIVE_INFINITY;
  return record.offers.filter((offer) => offer.productType === 'membership').sort((a, b) => weekly(a) - weekly(b));
}

/** Where to sign up: the page the membership price was read from, else the gym's own site. */
export function joinUrl(record: GymRecord): string | null {
  for (const offer of membershipsOf(record)) {
    const page = offer.provenance.sources.find((source) => source.sourceType === 'operator_website' && source.evidenceRef?.startsWith('http'));
    if (page?.evidenceRef) return page.evidenceRef;
  }
  return record.location.website ?? null;
}

/** "$11.95 per week", or what's known about a fee. */
function feeLine(label: string, minor: number | null, currency: VisitOffer['currency']): string {
  if (minor === null) return `${label}: not published`;
  if (minor === 0) return `No ${label.toLowerCase()}`;
  return `${label}: ${formatMoney(minor, currency)}`;
}

/** The line a gym's disagreeing membership sources carry, if any. */
function conflictOf(offers: VisitOffer[]): string | null {
  return offers.find((offer) => offer.provenance.status === 'conflicting')?.provenance.conflictNote ?? null;
}

/**
 * Membership prices, centred near the top of a gym's card: every tier the
 * gym publishes, side by side, and the way to sign up. Nothing when the gym
 * publishes none (Join this gym, further down, says so).
 */
export function MembershipBanner({ record }: { record: GymRecord }) {
  const tiers = membershipsOf(record).filter((offer) => offer.baseAmountMinor !== null);
  if (tiers.length === 0) return null;
  const url = record.location.isDemoData ? null : joinUrl(record);
  const disagree = conflictOf(tiers) !== null;
  return (
    <View style={styles.banner} accessibilityRole="summary">
      <Txt variant="eyebrow" color={color.brand} style={styles.center}>
        {tiers.length > 1 ? `MEMBERSHIP · ${tiers.length} OPTIONS` : 'MEMBERSHIP'}
      </Txt>
      <View style={styles.pills}>
        {tiers.map((offer) => {
          const view = describeMembership(offer);
          return (
            <View
              key={offer.id}
              style={styles.pill}
              accessible
              accessibilityLabel={`${offer.label}: ${formatMoney(offer.baseAmountMinor!, offer.currency)} ${view?.billingLabel ?? ''}`}
            >
              <Txt variant="caption" color={color.labelSecondary} numberOfLines={2} style={styles.center}>
                {offer.label}
              </Txt>
              <Txt variant="headline" style={styles.center}>
                {formatMoney(offer.baseAmountMinor!, offer.currency)}
              </Txt>
              {view && (
                <Txt variant="caption" color={color.labelSecondary} style={styles.center}>
                  {view.billingLabel}
                </Txt>
              )}
            </View>
          );
        })}
      </View>
      {disagree && (
        <Txt variant="footnote" color={color.maybeInk} style={styles.center}>
          The gym’s pages disagree on these prices. Check with the gym before you join.
        </Txt>
      )}
      {url && (
        <Pressy onPress={() => void WebBrowser.openBrowserAsync(url)} accessibilityRole="link" style={styles.signUp}>
          <Txt variant="subhead" color={color.brand} style={styles.bold}>
            Sign up on their website ↗
          </Txt>
        </Pressy>
      )}
    </View>
  );
}

export function JoinGym({ record }: { record: GymRecord }) {
  const memberships = membershipsOf(record);
  const url = record.location.isDemoData ? null : joinUrl(record);
  const phone = record.location.isDemoData ? null : record.location.phone;
  const cheapest = memberships[0];
  const cheapestView = cheapest ? describeMembership(cheapest) : null;
  const summary =
    cheapest && cheapest.baseAmountMinor !== null && cheapestView
      ? `${memberships.length > 1 ? 'From ' : ''}${formatMoney(cheapest.baseAmountMinor, cheapest.currency)} ${cheapestView.billingLabel}`
      : 'Membership prices not published';

  const conflict = conflictOf(memberships);
  return (
    <Fold icon="cards" title="Join this gym" summary={summary}>
      {conflict && (
        <Txt variant="footnote" color={color.maybeInk}>
          Sources disagree: {conflict}
        </Txt>
      )}
      {memberships.map((offer) => {
        const view = describeMembership(offer);
        const terms = offer.membershipTerms;
        const source = offer.provenance.sources[0];
        return (
          <View key={offer.id} style={styles.plan}>
            <View style={styles.planHead}>
              <View style={styles.flex}>
                <Txt variant="headline">{offer.label}</Txt>
                {offer.inclusions.some((item) => item !== offer.label) && (
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {offer.inclusions.filter((item) => item !== offer.label).join(' · ')}
                  </Txt>
                )}
              </View>
              <View style={styles.price}>
                <Txt variant="figure">{offer.baseAmountMinor === null ? 'Ask' : formatMoney(offer.baseAmountMinor, offer.currency)}</Txt>
                {view && (
                  <Txt variant="caption" color={color.labelSecondary}>
                    {view.billingLabel}
                  </Txt>
                )}
              </View>
            </View>
            {terms && view && (
              <View style={styles.terms}>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {feeLine('Joining fee', terms.joiningFeeMinor, offer.currency)} · {feeLine('Card fee', terms.accessCardFeeMinor, offer.currency)}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {view.minimumTermLabel} · {view.cancellationLabel}
                </Txt>
                {terms.notes.map((note) => (
                  <Txt key={note} variant="footnote" color={color.labelSecondary}>
                    {note}
                  </Txt>
                ))}
              </View>
            )}
            {source && (
              <Txt variant="caption" color={color.labelTertiary}>
                {source.label} · read {new Date(source.checkedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Txt>
            )}
          </View>
        );
      })}
      {memberships.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          This gym doesn’t publish what joining costs, so we don’t show a price. {url ? 'Its website may say more.' : phone ? 'Ask when you call.' : ''}
        </Txt>
      )}
      {url ? (
        <PrimaryButton
          label={memberships.length ? 'Sign up on their website' : 'Ask about joining on their website'}
          icon="website"
          tone={memberships.length ? 'brand' : 'quiet'}
          onPress={() => void WebBrowser.openBrowserAsync(url)}
        />
      ) : phone ? (
        <PrimaryButton label="Call to ask about joining" icon="call" tone="quiet" onPress={() => void Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => undefined)} />
      ) : null}
      {(url || phone) && (
        <Txt variant="caption" color={color.labelSecondary}>
          You join with the gym itself. GymGO doesn’t take payment or pass on your details, and prices can change: check before you sign.
        </Txt>
      )}
    </Fold>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    bold: face('semibold'),
    banner: { marginTop: space[3], gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, alignItems: 'center' },
    pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2], alignSelf: 'stretch' },
    pill: { minWidth: 92, flexGrow: 1, flexBasis: 92, maxWidth: 160, alignItems: 'center', gap: 1, paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.md, backgroundColor: color.brandTint },
    signUp: { paddingVertical: space[1], paddingHorizontal: space[3] },
    plan: { gap: space[1], paddingBottom: space[3], marginBottom: space[1], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.separator },
    planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
    price: { alignItems: 'flex-end' },
    terms: { gap: 2 },
  }),
);
