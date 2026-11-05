/**
 * Progress photos (lib/progressPhotos.ts): kept on this device only, never
 * uploaded. Hidden until you choose to show them each time the screen
 * opens, in case someone's looking over your shoulder. "Then and now" puts
 * the first beside the latest.
 */

import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Card, PrimaryButton, TextField, Txt } from '@/components/ui';
import { dateLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { photoUri } from '@/lib/photoVault';
import { MAX_PROGRESS_PHOTOS, addProgressPhoto, newestFirst, progressPhotos, removeProgressPhoto, setPhotoNote, thenAndNow } from '@/lib/progressPhotos';
import { color, radius, space, themed } from '@/lib/theme';
import { useTapAgain } from '@/lib/tapAgain';

export default function PhotosScreen() {
  useGlassRedraw();
  usePageTitle('Progress photos');
  const photos = progressPhotos.use();
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const width = Math.min(useWindowDimensions().width, 560) - space[4] * 2;
  const sorted = newestFirst(photos);
  const pair = thenAndNow(photos);
  const opened = sorted.find((photo) => photo.id === open) ?? null;

  const add = async () => {
    setProblem(null);
    setBusy(true);
    const result = await addProgressPhoto();
    setBusy(false);
    if (result === 'full') setProblem(`That’s ${MAX_PROGRESS_PHOTOS} photos, the most kept here. Delete one to add another.`);
    else if (result === 'failed') setProblem('That photo couldn’t be kept. Try another.');
    else if (result !== 'cancelled') {
      haptic.success();
      setShown(true);
    }
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Progress photos' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Progress photos
        </Txt>
        <View style={styles.privacy}>
          <Icon name="lock" size={15} color={color.goodInk} />
          <Txt variant="footnote" color={color.goodInk} style={styles.flex}>
            {`Only on this ${Platform.OS === 'web' ? 'computer, in this browser' : 'phone'}: never uploaded, not in your account, and GymPal can’t see them. ${
              Platform.OS === 'web' ? 'Clearing this site’s data deletes them.' : 'Deleting GymGO deletes them.'
            }`}
          </Txt>
        </View>
      </View>

      {photos.length > 0 && !shown && (
        <Card style={styles.card}>
          <Txt variant="headline">{`${photos.length} photo${photos.length === 1 ? '' : 's'}, hidden`}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            Hidden each time this opens, in case someone’s looking over your shoulder.
          </Txt>
          <PrimaryButton label="Show them" icon="eye" tone="quiet" onPress={() => setShown(true)} />
        </Card>
      )}

      {shown && opened && (
        <Card style={styles.card}>
          <Photo id={opened.id} width={width - space[4] * 2} label={`Progress photo from ${dateLabel(opened.addedOn)}`} />
          <Txt variant="headline">{dateLabel(opened.addedOn, { day: 'numeric', month: 'long', year: 'numeric' })}</Txt>
          <TextField label="Note (only here)" inSheet={false} value={opened.note} onChangeText={(text) => setPhotoNote(opened.id, text)} placeholder="Start of the programme" maxLength={120} />
          <DeleteButton
            onDelete={() => {
              void removeProgressPhoto(opened.id);
              setOpen(null);
            }}
          />
          <PrimaryButton label="Back to all" tone="quiet" onPress={() => setOpen(null)} />
        </Card>
      )}

      {shown && !opened && pair && (
        <Card style={styles.card}>
          <Txt variant="headline">Then and now</Txt>
          <View style={styles.pair}>
            {[pair.then, pair.now].map((photo) => (
              <View key={photo.id} style={styles.pairCell}>
                <Photo id={photo.id} width={(width - space[4] * 2 - space[2]) / 2} label={`Progress photo from ${dateLabel(photo.addedOn)}`} />
                <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
                  {dateLabel(photo.addedOn, { day: 'numeric', month: 'short', year: 'numeric' })}
                </Txt>
              </View>
            ))}
          </View>
        </Card>
      )}

      {shown && !opened && sorted.length > 0 && (
        <View style={styles.grid}>
          {sorted.map((photo) => (
            <Pressable
              key={photo.id}
              onPress={() => setOpen(photo.id)}
              accessibilityRole="button"
              accessibilityLabel={`Progress photo from ${dateLabel(photo.addedOn)}${photo.note ? `: ${photo.note}` : ''}`}
              style={styles.cell}
            >
              <Photo id={photo.id} width={(width - space[2] * 2) / 3} label="" />
              <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
                {dateLabel(photo.addedOn)}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}

      {photos.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          No photos yet. Add one now and another in a few weeks: Then and now puts them side by side.
        </Txt>
      )}
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
      <PrimaryButton label={busy ? 'Adding…' : 'Add a photo'} icon="plus" disabled={busy} onPress={() => void add()} />
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        Each is kept 1,200 pixels across at most and saved afresh, without the original’s details of where and on what it was taken.
      </Txt>
    </PageScroll>
  );
}

/** One kept photo, read from this device. */
function Photo({ id, width, label }: { id: string; width: number; label: string }) {
  const [uri, setUri] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let gone = false;
    void photoUri(id).then((found) => {
      if (!gone) setUri(found);
    });
    return () => {
      gone = true;
    };
  }, [id]);
  const height = Math.round(width * 1.33);
  if (uri === null) {
    return (
      <View style={[styles.missing, { width, height }]}>
        <Txt variant="caption" color={color.labelSecondary} style={styles.center}>
          This photo is no longer on this device
        </Txt>
      </View>
    );
  }
  if (!uri) return <View style={[styles.photo, { width, height }]} />;
  return <Image source={{ uri }} style={[styles.photo, { width, height }]} resizeMode="cover" accessibilityLabel={label || undefined} accessible={!!label} />;
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [sure, setSure] = useTapAgain();
  return <PrimaryButton label={sure ? 'Tap again to delete it' : 'Delete this photo'} tone="danger" onPress={() => (sure ? onDelete() : setSure(true))} />;
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    intro: { gap: space[2] },
    privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.goodTint },
    flex: { flex: 1, minWidth: 0 },
    card: { gap: space[3] },
    pair: { flexDirection: 'row', gap: space[2] },
    pairCell: { gap: space[1] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    cell: { gap: 2 },
    photo: { borderRadius: radius.md, backgroundColor: color.fill },
    missing: { borderRadius: radius.md, backgroundColor: color.fill, alignItems: 'center', justifyContent: 'center', padding: space[2] },
    center: { textAlign: 'center' },
    note: { paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
