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
import { color, face, space } from '@/lib/theme';
import { PlaceDetails } from './GooglePage';
import { PIcon } from './PIcon';
import { Txt } from './ui';

export function GoogleSection({ record }: { record: GymRecord }) {
  const [place, setPlace] = useState<GooglePlace | null>(null);
  const gymId = record.location.id;

  useEffect(() => {
    let live = true;
    setPlace(null);
    if (record.location.isDemoData) return;
    api
      .google(gymId)
      .then((result) => live && result.configured && result.found && setPlace(result.place))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [gymId, record.location.isDemoData]);

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
      <PlaceDetails place={place} />
      {/* Google's attribution, required wherever its place details show. */}
      <Txt style={styles.attribution}>Google Maps</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space[3], paddingHorizontal: space[4], marginTop: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  attribution: { textAlign: 'center', fontSize: 13, color: '#5F6368', ...face('bold') },
});
