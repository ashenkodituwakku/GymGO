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
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LogoCredit, LogoPlate } from '@/components/BrandLogo';
import { GoogleEmbed } from '@/components/GoogleEmbed';
import { GoogleModal } from '@/components/GoogleModal';
import { GoogleSection, useGooglePlace } from '@/components/GoogleSection';
import { GooglePhotos } from '@/components/GooglePage';
import { Icon, type IconName } from '@/components/Icon';
import { MemberKit } from '@/components/MemberKit';
import { PhotoHero } from '@/components/PhotoHero';
import { PlaceCard } from '@/components/PlaceCard';
import { ReviewsSection } from '@/components/ReviewsSection';
import { PrimaryButton, Txt } from '@/components/ui';
import { shareGym } from '@/lib/actions';
import { googleStreetViewEmbedUrl } from '@/lib/present';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { distanceLabel } from '@/lib/places';
import { resultsById } from '@/lib/results';
import { color, space } from '@/lib/theme';

const PAGE_WIDTH = 720;

export default function GymPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, account, filters, addRecent, requestExplore, compare, toggleCompare } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [googleOpen, setGoogleOpen] = useState(false);

  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const result = useMemo(() => (id ? resultsById(filters, data.records, asOf).get(id) : undefined), [id, filters, data.records, asOf]);

  const place = useGooglePlace(result?.record);
  const googlePhotos = Boolean(place && place.photos.length > 0);

  useEffect(() => {
    if (id) addRecent(id);
  }, [id, addRecent]);

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
  const subtitle = [location.address.suburb, result.distanceKm !== null ? distanceLabel(result.distanceKm, location.address.countryCode) : null]
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
            onOpenGoogle={() => setGoogleOpen(true)}
            onOpenWorkout={() => router.push({ pathname: '/workout/[id]', params: { id: location.id } })}
            asOf={asOf}
            photos={
              <PhotoHero
                gymId={location.id}
                isDemo={location.isDemoData}
                account={account}
                onSignIn={() => router.navigate('/profile')}
                width={cardWidth}
                fallback={
                  googlePhotos ? (
                    <GooglePhotos photos={place!.photos} width={cardWidth - space[4] * 2} />
                  ) : (
                    <View style={styles.streetView}>
                      <GoogleEmbed url={googleStreetViewEmbedUrl(result.record)} height={220} />
                      <Txt variant="caption" color={color.labelSecondary}>
                        Google Street View outside the gym. It may not face the door.
                      </Txt>
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
                onSignIn={() => router.navigate('/profile')}
              />
            }
            reviews={<ReviewsSection gymId={location.id} account={account} inSheet={false} onSignIn={() => router.navigate('/profile')} />}
          />
          <GoogleSection place={place} photosAbove={googlePhotos} />
          <View style={styles.credits}>
            <LogoCredit location={location} />
          </View>
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { alignItems: 'center', paddingBottom: space[8] },
  column: { maxWidth: '100%' },
  title: { gap: 2, paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[3] },
  streetView: { gap: space[1] },
  credits: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2] },
  mapButton: { paddingHorizontal: space[4] },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[1] },
  headerButton: { padding: 4 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  center: { textAlign: 'center' },
});
