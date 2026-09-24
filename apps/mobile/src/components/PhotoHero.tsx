/**
 * A gym's photos, across the top of its card.
 *
 * Every photo here was taken by a GymGO member, checked by a moderator, and
 * is credited to them. None is borrowed from the gym's website or stands in
 * for a different gym. When there are none yet, the page can pass a labelled
 * fallback (Google's own photos of the place, or Street View outside it);
 * otherwise the card says "No photo supplied" and invites the first one.
 */

import * as ImagePicker from 'expo-image-picker';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { api, ApiError, OfflineError, photoUrl, type GymPhoto } from '@/lib/api';
import { EMPTY } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space } from '@/lib/theme';
import { Icon } from './Icon';
import { PrimaryButton, Txt } from './ui';

type Step = { kind: 'idle' } | { kind: 'confirm'; uri: string; data: string } | { kind: 'sending' } | { kind: 'done'; text: string };

export function PhotoHero({
  gymId,
  isDemo,
  account,
  onSignIn,
  width: panelWidth,
  fallback,
}: {
  /** Shown instead of "No photo supplied yet" when nobody has shared one (e.g. Street View). */
  fallback?: ReactNode;
  gymId: string;
  isDemo: boolean;
  account: AccountApi;
  onSignIn: () => void;
  /** The card's width, when it isn't the window's (desktop panels). */
  width?: number;
}) {
  const window = useWindowDimensions();
  const width = (panelWidth ?? window.width) - space[4] * 2;
  const [photos, setPhotos] = useState<GymPhoto[] | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const token = account.state === 'signed_in' ? account.token : null;

  const load = useCallback(() => {
    api
      .photos(gymId, token)
      .then((result) => {
        setPhotos(result.photos);
        setWaiting(result.mine.filter((item) => item.status === 'pending').length);
      })
      .catch(() => setPhotos([]));
  }, [gymId, token]);

  useEffect(() => {
    setStep({ kind: 'idle' });
    load();
  }, [load]);

  const pick = async () => {
    if (!token) return onSignIn();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      exif: false,
      allowsEditing: true,
      aspect: [4, 3],
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;
    haptic.select();
    setStep({ kind: 'confirm', uri: asset.uri, data: asset.base64 });
  };

  const send = async (data: string) => {
    if (!token) return;
    setStep({ kind: 'sending' });
    try {
      await api.uploadPhoto(token, gymId, data);
      haptic.success();
      setStep({ kind: 'done', text: 'Thanks! A moderator will check it, then it shows here with your name on it.' });
      load();
    } catch (error) {
      haptic.warn();
      setStep({
        kind: 'done',
        text:
          error instanceof OfflineError
            ? 'Can’t reach the GymGO server right now.'
            : error instanceof ApiError
              ? error.message
              : 'That didn’t work. Try another photo?',
      });
    }
  };

  if (step.kind === 'confirm') {
    return (
      <View style={styles.confirm}>
        <Image source={{ uri: step.uri }} style={[styles.preview, { width }]} resizeMode="cover" />
        <Txt variant="subhead">
          Did you take this photo, and are you happy for GymGO to show it with your name? We remove its location data first.
        </Txt>
        <View style={styles.row}>
          <View style={styles.flex}>
            <PrimaryButton label="Yes, share it" onPress={() => void send(step.data)} />
          </View>
          <View style={styles.flex}>
            <PrimaryButton label="Cancel" tone="quiet" onPress={() => setStep({ kind: 'idle' })} />
          </View>
        </View>
      </View>
    );
  }

  const list = photos ?? [];
  return (
    <View style={styles.wrap}>
      {list.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width }}>
          {list.map((photo) => {
            const uri = photoUrl(photo.url);
            return (
              <View key={photo.id} style={{ width }}>
                {uri && <Image source={{ uri }} style={[styles.photo, { width }]} resizeMode="cover" accessibilityLabel={`Photo by ${photo.credit}`} />}
                <View style={styles.credit}>
                  <Icon name="photo" size={11} color={color.onBrand} />
                  <Txt variant="caption" color={color.onBrand}>
                    {photo.credit}
                  </Txt>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : fallback && !isDemo && photos !== null ? (
        <View style={[styles.fallback, { width }]}>
          {fallback}
          <Txt variant="footnote" color={color.labelSecondary}>
            No GymGO member photos yet. Been here? Add the first.
          </Txt>
        </View>
      ) : (
        <View style={[styles.empty, { width }]}>
          <Icon name="photo" size={30} color={color.labelTertiary} />
          <Txt variant="headline">{EMPTY.photos}</Txt>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            {isDemo ? 'This is an invented demo gym, so there’s nothing to photograph.' : 'Been here? Your photo could be the first.'}
          </Txt>
        </View>
      )}

      {!isDemo && step.kind !== 'sending' && (
        <Pressable onPress={() => void pick()} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
          <Txt variant="subhead" color={color.brand} style={face('bold')}>
            {token ? '+ Add a photo' : '+ Sign in to add a photo'}
          </Txt>
        </Pressable>
      )}
      {step.kind === 'sending' && (
        <Txt variant="footnote" color={color.labelSecondary}>
          Sending your photo…
        </Txt>
      )}
      {step.kind === 'done' && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {step.text}
        </Txt>
      )}
      {step.kind !== 'done' && waiting > 0 && (
        <Txt variant="footnote" color={color.maybeInk}>
          {waiting === 1 ? 'Your photo is' : `${waiting} of your photos are`} waiting for a moderator.
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2], alignItems: 'flex-start' },
  fallback: { gap: space[2] },
  photo: { height: 180, borderRadius: radius.xl, borderCurve: 'continuous' },
  credit: {
    position: 'absolute',
    left: space[3],
    bottom: space[3],
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empty: {
    height: 150,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(88, 86, 214, 0.28)',
    backgroundColor: 'rgba(88, 86, 214, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: space[4],
  },
  center: { textAlign: 'center' },
  add: { paddingVertical: space[1] },
  confirm: { gap: space[3] },
  preview: { height: 200, borderRadius: radius.xl },
  row: { flexDirection: 'row', gap: space[2] },
  flex: { flex: 1 },
});
