/**
 * Google's details on a gym's own page: photos, reviews, rating, hours,
 * phone, website, and what Google knows about access, parking and payment.
 *
 * Only when whoever runs the GymGO server has set their own Places API key
 * (Google bills for it); otherwise nothing shows here, and "See it on Google"
 * on the card opens Google's free map and listing instead. The gym page has
 * no map on it, which Google's terms need for Places content.
 *
 * Kept apart from GymGO's own facts and never feeding the verdict: Google's
 * hours say when a gym is open, not when a visitor may come.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { GymRecord } from '@gymgo/domain';
import { api, type GooglePlace } from '@/lib/api';
import { color, face, space, themed } from '@/lib/theme';
import { PlaceDetails } from './GooglePage';
import { PIcon } from './PIcon';
import { Txt } from './ui';

/** The gym's Google listing, when the server has a key and Google knows the place. */
export function useGooglePlace(record: GymRecord | undefined): GooglePlace | null {
  const [place, setPlace] = useState<GooglePlace | null>(null);
  const gymId = record?.location.id;
  const isDemo = record?.location.isDemoData ?? true;

  useEffect(() => {
    let live = true;
    setPlace(null);
    if (!gymId || isDemo) return;
    api
      .google(gymId)
      .then((result) => live && result.configured && result.found && setPlace(result.place))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [gymId, isDemo]);

  return place;
}

/** `photosAbove` when the page already shows Google's photos at the top. */
export function GoogleSection({ place, photosAbove = false }: { place: GooglePlace | null; photosAbove?: boolean }) {
  if (!place) return null;
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <PIcon name="globe-hemisphere-west" size={24} color={color.brand} accent={color.brand} />
        <Txt variant="title2" style={styles.flex}>
          From Google Maps
        </Txt>
      </View>
      <Txt variant="footnote" color={color.labelSecondary}>
        Live from Google, not checked by GymGO and not saved. It doesn’t change GymGO’s answer above.
      </Txt>
      <PlaceDetails place={place} hidePhotos={photosAbove} />
      {/* Google's attribution, required wherever its place details show. */}
      <Txt style={styles.attribution}>Google Maps</Txt>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space[3], paddingHorizontal: space[4], marginTop: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  attribution: { textAlign: 'center', fontSize: 13, color: color.googleInk, ...face('bold') },
}));
