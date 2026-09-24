/**
 * What Google Maps says about a gym, on its own full screen.
 *
 * Free, with no key and no account: the top of the page is Google's own
 * embeddable map with Google's card for the gym (its star rating, number of
 * reviews and address), loaded straight from Google. One tap on it, or on
 * "Open in Google Maps", shows every photo and review in Google Maps itself.
 * Below it, Google's Street View nearest the gym, from the same free embed.
 * GymGO copies and stores none of it; Google shows and credits its own
 * content.
 *
 * If whoever runs the GymGO server has also set their own Places API key
 * (billing needed), Google's photos, reviews and hours appear right here as
 * well, under the same rules: fetched fresh, never saved, every author
 * credited, and on a page whose only map is Google's.
 *
 * None of it changes GymGO's own answer. Google's opening hours are when a
 * gym is open, not when a visitor may come; its reviews aren't ours.
 */

import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GymRecord } from '@gymgo/domain';
import { api, type GoogleAuthor, type GooglePlace } from '@/lib/api';
import { googleMapsEmbedUrl, googleMapsSearchUrl, googleStreetViewEmbedUrl } from '@/lib/present';
import { color, face, radius, space } from '@/lib/theme';
import { GoogleEmbed } from './GoogleEmbed';
import { CloseButton, PrimaryButton, Txt } from './ui';

const open = (url: string) => void WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));

export function GooglePage({ record, onClose }: { record: GymRecord; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Google's extra details, only when the server has a Places key. Without
  // one (the usual case) this stays null and the free embed is the page.
  const [place, setPlace] = useState<GooglePlace | null>(null);
  const gymId = record.location.id;

  useEffect(() => {
    let live = true;
    setPlace(null);
    api
      .google(gymId)
      .then((result) => live && result.configured && result.found && setPlace(result.place))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [gymId]);

  const mapsUrl = place?.googleMapsUri ?? googleMapsSearchUrl(record);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            ON GOOGLE MAPS
          </Txt>
          <Txt variant="title" numberOfLines={2}>
            {record.location.name}
          </Txt>
        </View>
        <CloseButton onPress={onClose} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space[8] }]}>
        <GoogleEmbed url={googleMapsEmbedUrl(record)} height={Math.round(Math.min(Math.max(height * 0.5, 320), 520))} />

        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          That’s Google’s own map and listing, straight from Google, free. Tap the ↗ on Google’s card or the button
          below to see every photo and review in Google Maps.
        </Txt>

        <View style={styles.cta}>
          <PrimaryButton label="Open in Google Maps" icon="map" onPress={() => open(mapsUrl)} />
        </View>

        <Txt variant="title2" style={styles.more}>
          Street View
        </Txt>
        <GoogleEmbed url={googleStreetViewEmbedUrl(record)} height={260} />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          Google’s Street View nearest the gym. Drag to look around: it may not be facing the door.
        </Txt>

        {place && (
          <>
            <Txt variant="title2" style={styles.more}>
              More from Google
            </Txt>
            <PlaceDetails place={place} />
            <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
              Shown live from Google and not saved by GymGO. Google’s hours are when the gym is open, which isn’t always
              when a visitor can come: GymGO’s own card says that.
            </Txt>
            {/* Google's attribution, required wherever its place details show. */}
            <Txt style={styles.attribution}>Google Maps</Txt>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Google's photos of a place, a page at a time, each credited to whoever
 * took it, with Google's attribution beneath. For the top of a gym's page.
 */
export function GooglePhotos({ photos, width }: { photos: GooglePlace['photos']; width: number }) {
  return (
    <View style={styles.hero}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width }}>
        {photos.map((photo, index) => (
          <View key={`${index}-${photo.uri}`} style={{ width, gap: 4 }}>
            <Image source={{ uri: photo.uri }} style={[styles.heroPhoto, { width }]} resizeMode="cover" />
            <Credit prefix={`Photo ${index + 1} of ${photos.length}`} authors={photo.authors} />
          </View>
        ))}
      </ScrollView>
      <Txt style={styles.heroAttribution}>Google Maps</Txt>
    </View>
  );
}

/** Google's details; `hidePhotos` when the photos already show above. */
export function PlaceDetails({ place, hidePhotos = false }: { place: GooglePlace; hidePhotos?: boolean }) {
  const { width } = useWindowDimensions();
  const photoWidth = Math.min(width - space[4] * 2, 520) * 0.82;
  const closed = place.businessStatus && place.businessStatus !== 'OPERATIONAL';

  return (
    <View style={styles.details}>
      <View style={styles.summary}>
        {place.rating !== null && (
          <Txt variant="headline">
            ★ {place.rating.toFixed(1)}
            <Txt variant="subhead" color={color.labelSecondary}>
              {place.ratingCount ? `  ·  ${place.ratingCount.toLocaleString()} Google reviews` : ''}
            </Txt>
          </Txt>
        )}
        {closed ? (
          <View style={[styles.badge, { backgroundColor: color.noTint }]}>
            <Txt variant="footnote" color={color.noInk} style={face('bold')}>
              {place.businessStatus === 'CLOSED_PERMANENTLY' ? 'Google says: closed for good' : 'Google says: closed for now'}
            </Txt>
          </View>
        ) : place.openNow !== null ? (
          <View style={[styles.badge, { backgroundColor: place.openNow ? color.goodTint : color.maybeTint }]}>
            <Txt variant="footnote" color={place.openNow ? color.goodInk : color.maybeInk} style={face('bold')}>
              {place.openNow ? 'Open now' : 'Closed now'}
            </Txt>
          </View>
        ) : null}
        {place.address && (
          <Txt variant="subhead" color={color.labelSecondary}>
            {place.address}
          </Txt>
        )}
        {place.type && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {place.type} on Google
          </Txt>
        )}
        {place.summary && <Txt variant="subhead">“{place.summary}”</Txt>}
      </View>

      {!hidePhotos && place.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {place.photos.map((photo, index) => (
            <View key={`${index}-${photo.uri}`} style={{ width: photoWidth, gap: 4 }}>
              <Image source={{ uri: photo.uri }} style={[styles.photo, { width: photoWidth }]} resizeMode="cover" />
              <Credit prefix="Photo" authors={photo.authors} />
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.links}>
        {place.phone && (
          <View style={styles.flex}>
            <PrimaryButton label={place.phone} icon="call" tone="quiet" onPress={() => void Linking.openURL(`tel:${place.phone!.replace(/\s+/g, '')}`)} />
          </View>
        )}
        {place.website && (
          <View style={styles.flex}>
            <PrimaryButton label="Website" icon="website" tone="quiet" onPress={() => open(place.website!)} />
          </View>
        )}
      </View>

      {(['Accessibility', 'Parking', 'Payments'] as const).map((group) => {
        const items = place.details.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <View key={group} style={styles.card}>
            <Txt variant="headline">
              {group}
            </Txt>
            <View style={styles.detailChips}>
              {items.map((item) => (
                <View key={item.label} style={[styles.detailChip, { backgroundColor: item.value ? color.goodTint : color.noTint }]}>
                  <Txt variant="footnote" color={item.value ? color.goodInk : color.noInk}>
                    {item.value ? '✓' : '✗'} {item.label}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {place.hours.length > 0 && (
        <View style={styles.card}>
          <Txt variant="headline">Opening hours</Txt>
          {place.hours.map((line) => (
            <Txt key={line} variant="subhead" color={color.labelSecondary}>
              {line}
            </Txt>
          ))}
        </View>
      )}

      {place.reviews.length > 0 && (
        <View style={styles.reviews}>
          <Txt variant="title2">What people say on Google</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            Google picks these few and puts its most relevant first.
          </Txt>
          {place.reviews.map((review, index) => (
            <View key={`${review.author.name}-${index}`} style={styles.card}>
              <View style={styles.reviewHead}>
                <Author author={review.author} />
                {review.rating !== null && <Txt variant="subhead">{'★'.repeat(Math.round(review.rating))}</Txt>}
              </View>
              {review.when && (
                <Txt variant="caption" color={color.labelSecondary}>
                  {review.when}
                </Txt>
              )}
              {review.text ? <Txt variant="subhead">{review.text}</Txt> : null}
              {review.googleMapsUri && (
                <Pressable onPress={() => open(review.googleMapsUri!)} accessibilityRole="link" hitSlop={6}>
                  <Txt variant="caption" color={color.brand}>
                    See it on Google Maps ↗
                  </Txt>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Author({ author }: { author: GoogleAuthor }) {
  const body = (
    <View style={styles.author}>
      {author.photoUri ? <Image source={{ uri: author.photoUri }} style={styles.avatar} /> : null}
      <Txt variant="headline" color={author.uri ? color.brand : color.label}>
        {author.name}
      </Txt>
    </View>
  );
  if (!author.uri) return body;
  return (
    <Pressable onPress={() => open(author.uri!)} accessibilityRole="link">
      {body}
    </Pressable>
  );
}

function Credit({ prefix, authors }: { prefix: string; authors: GoogleAuthor[] }) {
  if (authors.length === 0) return null;
  return (
    <View style={styles.credit}>
      <Txt variant="caption" color={color.labelSecondary}>
        {prefix}:{' '}
      </Txt>
      {authors.map((author, index) => (
        <Pressable key={`${author.name}-${index}`} disabled={!author.uri} onPress={() => author.uri && open(author.uri)} accessibilityRole="link">
          <Txt variant="caption" color={author.uri ? color.brand : color.labelSecondary}>
            {author.name}
            {index < authors.length - 1 ? ', ' : ''}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.groupedBackground },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[3],
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  body: { paddingHorizontal: space[4], gap: space[4], width: '100%', maxWidth: 640, alignSelf: 'center' },
  more: { marginTop: space[4] },
  details: { gap: space[4] },
  summary: { gap: space[2], alignItems: 'flex-start' },
  badge: { paddingHorizontal: space[3], paddingVertical: 4, borderRadius: radius.pill },
  photos: { gap: space[3] },
  hero: { gap: 2 },
  heroPhoto: { height: 240, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.fill },
  heroAttribution: { fontSize: 12, color: '#5F6368', ...face('bold') },
  photo: { height: 190, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.fill },
  credit: { flexDirection: 'row', flexWrap: 'wrap' },
  links: { flexDirection: 'row', gap: space[2] },
  detailChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
  detailChip: { paddingHorizontal: space[3], paddingVertical: 4, borderRadius: radius.pill },
  card: {
    gap: space[1],
    padding: space[4],
    borderRadius: radius.lg + 4,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  reviews: { gap: space[2] },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  author: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 1 },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  cta: { marginTop: space[2] },
  attribution: {
    textAlign: 'center',
    marginTop: space[2],
    fontSize: 13,
    color: '#5F6368',
    ...face('bold'),
  },
});
