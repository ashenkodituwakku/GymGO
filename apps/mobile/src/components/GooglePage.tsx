/**
 * What Google Maps says about a gym, live, on its own full screen.
 *
 * Google's terms decide the shape of this page:
 *  - It fills the screen and has no map on it, because Google doesn't allow
 *    its place details next to a map that isn't Google's (ours are Apple's
 *    and OpenStreetMap's).
 *  - Everything is fetched fresh each time and never saved; the server keeps
 *    only Google's ID for the place.
 *  - Google is credited, every photo and review names its author with a link,
 *    and "Open in Google Maps" is always there.
 *  - None of it changes GymGO's own answer. Google's opening hours are when a
 *    gym is open, not when a visitor may come; its reviews aren't ours.
 *
 * It only works once whoever runs the GymGO server adds their own Google key.
 * Without one, the page says so and still offers the plain Google Maps link,
 * which needs no key at all.
 */

import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GymRecord } from '@gymgo/domain';
import { api, ApiError, OfflineError, type GoogleAuthor, type GooglePlace, type GoogleResult } from '@/lib/api';
import { googleMapsSearchUrl } from '@/lib/present';
import { color, face, radius, space } from '@/lib/theme';
import { CloseButton, PrimaryButton, Txt } from './ui';

type State = { kind: 'loading' } | { kind: 'ready'; result: GoogleResult } | { kind: 'failed'; message: string };

const open = (url: string) => void WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));

export function GooglePage({ record, onClose }: { record: GymRecord; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const gymId = record.location.id;

  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    api
      .google(gymId)
      .then((result) => live && setState({ kind: 'ready', result }))
      .catch(
        (error) =>
          live &&
          setState({
            kind: 'failed',
            message:
              error instanceof OfflineError
                ? 'Can’t reach the GymGO server, so we can’t ask Google right now.'
                : error instanceof ApiError
                  ? error.message
                  : 'Google didn’t answer. Try again in a bit.',
          }),
      );
    return () => {
      live = false;
    };
  }, [gymId]);

  const place = state.kind === 'ready' && state.result.configured && state.result.found ? state.result.place : null;
  const mapsUrl = place?.googleMapsUri ?? googleMapsSearchUrl(record);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            ON GOOGLE MAPS
          </Txt>
          <Txt variant="title" numberOfLines={2}>
            {place?.name ?? record.location.name}
          </Txt>
        </View>
        <CloseButton onPress={onClose} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space[8] }]}>
        {state.kind === 'loading' && (
          <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
            Asking Google… 🔎
          </Txt>
        )}

        {state.kind === 'failed' && <Message emoji="😕" title="Couldn’t load Google’s info" text={state.message} />}

        {state.kind === 'ready' && !state.result.configured && (
          <Message
            emoji="🔌"
            title="Google info isn’t switched on"
            text={
              'Google only lets apps show its photos, reviews and hours live, through its own paid service. ' +
              'Whoever runs this GymGO server can switch it on with their own Google Maps key (see “Google info” in the README). ' +
              'Until then, the button below opens this gym in Google Maps itself.'
            }
          />
        )}

        {state.kind === 'ready' && state.result.configured && !state.result.found && (
          <Message
            emoji="🤷"
            title={state.result.reason === 'demo' ? 'This is a made-up demo gym' : 'We couldn’t find it on Google'}
            text={
              state.result.reason === 'demo'
                ? 'It isn’t a real place, so Google has nothing on it.'
                : 'No Google listing sits at this gym’s address. The button below searches Google Maps for it instead.'
            }
          />
        )}

        {place && <PlaceDetails place={place} />}

        <View style={styles.cta}>
          <PrimaryButton label="Open in Google Maps" onPress={() => open(mapsUrl)} />
        </View>

        {place && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            Shown live from Google and not saved by GymGO. Google’s hours are when the gym is open, which isn’t always
            when a visitor can come: GymGO’s own card says that.
          </Txt>
        )}

        {/* Google's attribution, required wherever its place details show. */}
        <Txt style={styles.attribution}>
          Google Maps
        </Txt>
      </ScrollView>
    </View>
  );
}

function PlaceDetails({ place }: { place: GooglePlace }) {
  const { width } = useWindowDimensions();
  const photoWidth = Math.min(width - space[4] * 2, 520) * 0.82;
  const closed = place.businessStatus && place.businessStatus !== 'OPERATIONAL';

  return (
    <View style={styles.details}>
      <View style={styles.summary}>
        {place.rating !== null && (
          <Txt variant="headline">
            ⭐ {place.rating.toFixed(1)}
            <Txt variant="subhead" color={color.labelSecondary}>
              {place.ratingCount ? `  ·  ${place.ratingCount.toLocaleString('en-AU')} Google reviews` : ''}
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
      </View>

      {place.photos.length > 0 && (
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
            <PrimaryButton label={`📞 ${place.phone}`} tone="quiet" onPress={() => void Linking.openURL(`tel:${place.phone!.replace(/\s+/g, '')}`)} />
          </View>
        )}
        {place.website && (
          <View style={styles.flex}>
            <PrimaryButton label="🌐 Website" tone="quiet" onPress={() => open(place.website!)} />
          </View>
        )}
      </View>

      {place.hours.length > 0 && (
        <View style={styles.card}>
          <Txt variant="headline">🕒 Opening hours</Txt>
          {place.hours.map((line) => (
            <Txt key={line} variant="subhead" color={color.labelSecondary}>
              {line}
            </Txt>
          ))}
        </View>
      )}

      {place.reviews.length > 0 && (
        <View style={styles.reviews}>
          <Txt variant="title2">💬 What people say on Google</Txt>
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
                <Txt variant="caption" color={color.labelTertiary}>
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

function Message({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <View style={styles.message}>
      <Txt style={styles.bigEmoji}>{emoji}</Txt>
      <Txt variant="title2" style={styles.center}>
        {title}
      </Txt>
      <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
        {text}
      </Txt>
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
  message: { alignItems: 'center', gap: space[2], paddingVertical: space[6], paddingHorizontal: space[2] },
  bigEmoji: { fontSize: 48, lineHeight: 58 },
  details: { gap: space[4] },
  summary: { gap: space[2], alignItems: 'flex-start' },
  badge: { paddingHorizontal: space[3], paddingVertical: 4, borderRadius: radius.pill },
  photos: { gap: space[3] },
  photo: { height: 190, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.fill },
  credit: { flexDirection: 'row', flexWrap: 'wrap' },
  links: { flexDirection: 'row', gap: space[2] },
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
