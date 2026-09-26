/**
 * A gym's own page, pushed on top of the tabs the way iOS apps open a
 * detail screen: back button (and swipe back) top left; share, compare and
 * save top right; the same card as the map shows, with room to breathe.
 *
 * Its verdict comes from the current search (time, budget, what you need),
 * so it always agrees with the map and the lists.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LogoPlate } from '@/components/BrandLogo';
import { GoogleEmbed } from '@/components/GoogleEmbed';
import { GoogleModal } from '@/components/GoogleModal';
import { GoogleSection, useGooglePlace } from '@/components/GoogleSection';
import { GooglePhotos } from '@/components/GooglePage';
import { Icon, type IconName } from '@/components/Icon';
import { MemberAccess } from '@/components/MemberAccess';
import { MemberKit } from '@/components/MemberKit';
import { MemberPrices } from '@/components/MemberPrices';
import { MemberStatus, StatusWarning } from '@/components/MemberStatus';
import { PhotoHero } from '@/components/PhotoHero';
import { PlaceCard } from '@/components/PlaceCard';
import { ReviewsSection } from '@/components/ReviewsSection';
import { PrimaryButton, Txt } from '@/components/ui';
import { shareGym } from '@/lib/actions';
import { googleStreetViewEmbedUrl } from '@/lib/present';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { gymDistanceLine } from '@/lib/copy';
import { resultsById } from '@/lib/results';
import { color, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';

const PAGE_WIDTH = 720;

export default function GymPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, account, filters, addRecent, requestExplore, compare, toggleCompare, prefsReady } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [googleOpen, setGoogleOpen] = useState(false);

  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const result = useMemo(() => (id ? resultsById(filters, data.records, asOf, data.ratings).get(id) : undefined), [id, filters, data.records, asOf, data.ratings]);
  usePageTitle(result?.record.location.name ?? 'Gym');

  const place = useGooglePlace(result?.record);
  const googlePhotos = Boolean(place && place.photos.length > 0);

  useEffect(() => {
    if (id) addRecent(id);
  }, [id, addRecent]);

  // A gym found by searching an area isn't in the app's own data: opened
  // from a link, it's fetched first. "Not found" only once that's failed.
  const [looking, setLooking] = useState(true);
  const { ensureGyms } = data;
  const known = Boolean(result);
  useEffect(() => {
    if (!id || known) return;
    let live = true;
    setLooking(true);
    void ensureGyms([id]).finally(() => {
      if (live) setLooking(false);
    });
    return () => {
      live = false;
    };
  }, [id, known, ensureGyms]);

  // Its distance and the answer for your visit are worked out from your
  // settings, so a link opened cold waits the moment it takes to read them.
  if (!prefsReady || (!result && looking)) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Gym' }} />
        <ActivityIndicator color={color.brand} />
        <Txt variant="subhead" color={color.labelSecondary}>
          Finding this gym…
        </Txt>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Gym' }} />
        <Txt variant="title2">Gym not found</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          It may have been removed from GymGO. Try searching the map.
        </Txt>
        <PrimaryButton label="Back" tone="quiet" onPress={() => router.back()} />
      </View>
    );
  }

  const location = result.record.location;
  const saved = account.saved.includes(location.id);
  const comparing = compare.includes(location.id);
  const cardWidth = Math.min(width, PAGE_WIDTH);
  const subtitle = [location.address.suburb, result.distanceKm !== null ? gymDistanceLine(result.distanceKm, location.address.countryCode, filters.placeName) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerButtons}>
              {!location.isDemoData && <HeaderButton icon="share" label="Share" onPress={() => void shareGym(result.record)} />}
              <HeaderButton
                icon="compare"
                label={comparing ? 'Remove from Compare' : 'Add to Compare'}
                on={comparing}
                onPress={() => toggleCompare(location.id)}
              />
              <HeaderButton
                icon={saved ? 'saved' : 'save'}
                label={saved ? 'Remove from Saved' : 'Save'}
                on={saved}
                onPress={() => {
                  if (!saved) haptic.success();
                  account.toggleSave(location.id);
                }}
              />
            </View>
          ),
        }}
      />
      <ScrollView
        style={styles.page}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={[styles.column, { width: cardWidth }]}>
          <View style={styles.title}>
            <LogoPlate location={location} />
            <Txt variant="largeTitle">{location.name}</Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {subtitle}
            </Txt>
          </View>
          <PlaceCard
            result={result}
            visitMinute={filters.visitMinuteOfDay}
            visitDate={filters.visitDate}
            saved={saved}
            onToggleSave={() => account.toggleSave(location.id)}
            saveAndShareElsewhere
            onOpenGoogle={() => setGoogleOpen(true)}
            onOpenWorkout={() => router.push({ pathname: '/workout/[id]', params: { id: location.id } })}
            asOf={asOf}
            photos={
              <PhotoHero
                gymId={location.id}
                isDemo={location.isDemoData}
                account={account}
                onSignIn={() => router.push('/sign-in')}
                width={cardWidth}
                fallback={
                  googlePhotos ? (
                    <GooglePhotos photos={place!.photos} width={cardWidth - space[4] * 2} />
                  ) : (
                    <View style={styles.streetView}>
                      <GoogleEmbed
                        url={googleStreetViewEmbedUrl(result.record)}
                        height={220}
                        what="Street View"
                        caption={
                          <Txt variant="caption" color={color.labelSecondary}>
                            Google Street View outside the gym. It may not face the door.
                          </Txt>
                        }
                      />
                    </View>
                  )
                }
              />
            }
            memberKit={
              <MemberKit
                gymId={location.id}
                isDemo={location.isDemoData}
                account={account}
                inSheet={false}
                onSignIn={() => router.push('/sign-in')}
              />
            }
            statusWarning={<StatusWarning gymId={location.id} isDemo={location.isDemoData} token={account.state === 'signed_in' ? account.token : null} />}
            memberStatus={<MemberStatus gymId={location.id} isDemo={location.isDemoData} account={account} onSignIn={() => router.push('/sign-in')} />}
            memberAccess={
              <MemberAccess gymId={location.id} isDemo={location.isDemoData} account={account} onSignIn={() => router.push('/sign-in')} />
            }
            memberPrices={
              <MemberPrices
                gymId={location.id}
                isDemo={location.isDemoData}
                country={location.address.countryCode}
                account={account}
                inSheet={false}
                onSignIn={() => router.push('/sign-in')}
              />
            }
            reviews={<ReviewsSection gymId={location.id} account={account} inSheet={false} onSignIn={() => router.push('/sign-in')} />}
          />
          <GoogleSection place={place} photosAbove={googlePhotos} />
          <View style={styles.mapButton}>
            <PrimaryButton
              label="Show on the map"
              icon="map"
              tone="quiet"
              onPress={() => {
                requestExplore({ gymId: location.id });
                router.navigate('/explore');
              }}
            />
          </View>
        </View>
      </ScrollView>
      <GoogleModal record={googleOpen ? result.record : undefined} onClose={() => setGoogleOpen(false)} />
    </>
  );
}

function HeaderButton({ icon, label, onPress, on = false }: { icon: IconName; label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      hitSlop={8}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={19} color={on ? color.brand : Platform.OS === 'ios' ? color.label : color.brand} />
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { alignItems: 'center', paddingBottom: space[8] },
  column: { maxWidth: '100%' },
  title: { gap: 2, paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[3] },
  streetView: { gap: space[1] },
  mapButton: { paddingHorizontal: space[4] },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[1] },
  headerButton: { padding: 4 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  center: { textAlign: 'center' },
}));
