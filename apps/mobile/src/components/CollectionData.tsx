/**
 * Where your gym collection is kept, and deleting it: at the top and foot of
 * the collection, and in Account → Your data.
 *
 * Signed in, the collection is on your account as well as this device
 * (lib/useCollection.ts), so deleting it clears both, and your other devices
 * with them. A warning says exactly what goes before anything does, and
 * signed in with the server out of reach, nothing is deleted at all.
 */

import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { collectionStats } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { color, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';

/** Signed in (still, while the server is away), not yet known, or signed out. */
function useSignedIn() {
  const { account } = useApp();
  return {
    signedIn: account.state === 'signed_in' || account.state === 'unreachable',
    known: account.state !== 'loading',
    reconnect: account.state === 'unreachable' ? account.reconnect : null,
  };
}

/** Whether the collection is on your account and up to date, or on this device only. */
export function CollectionSyncLine() {
  const router = useRouter();
  const { sync, retry } = useCollection();
  const { signedIn, known, reconnect } = useSignedIn();
  if (!known) return null;
  if (!signedIn || sync === 'signed-out') {
    return (
      <View style={styles.sync}>
        <Icon name="offline" size={16} color={color.labelSecondary} />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
          Kept on this device only. Sign in to keep it on your account too, and see it on your other devices.
        </Txt>
        <PrimaryButton label="Sign in" tone="quiet" onPress={() => router.push('/sign-in')} />
      </View>
    );
  }
  if (sync === 'offline' || sync === 'failed') {
    return (
      <View style={styles.sync}>
        <Icon name="offline" size={16} color={color.labelSecondary} />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
          {sync === 'offline'
            ? 'Couldn’t reach the GymGO server. Your check-ins are safe on this device and go to your account when it’s back.'
            : 'Couldn’t sync with your account just now. Your check-ins are safe on this device.'}
        </Txt>
        <PrimaryButton label="Try again" icon="refresh" tone="quiet" onPress={() => void (reconnect ? reconnect() : retry())} />
      </View>
    );
  }
  return (
    <View style={styles.sync} accessibilityLiveRegion="polite">
      <Icon name="cloud" size={16} color={color.brand} />
      <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
        {sync === 'syncing' ? 'Syncing with your account…' : 'Synced with your account, so it’s on your other devices too.'}
      </Txt>
    </View>
  );
}

/**
 * Deleting the whole collection: `open` shows the warning, `warning` is the
 * warning itself (null while closed), to put where the page wants it.
 */
export function useDeleteCollection(): { open: () => void; opened: boolean; warning: ReactElement | null; gyms: number; visits: number } {
  const { gyms, reset } = useCollection();
  const { signedIn } = useSignedIn();
  const [step, setStep] = useState<'closed' | 'warning' | 'deleting'>('closed');
  const [problem, setProblem] = useState<string | null>(null);
  const stats = collectionStats(gyms);
  const close = () => {
    setStep('closed');
    setProblem(null);
  };
  const confirm = async () => {
    setStep('deleting');
    setProblem(null);
    try {
      await reset();
      haptic.success();
      setStep('closed');
    } catch {
      haptic.warn();
      setStep('warning');
      setProblem('Couldn’t reach the GymGO server, so nothing was deleted. Try again when you’re online.');
    }
  };
  const cards = stats.gyms === 1 ? 'your card' : `all ${stats.gyms} of your cards`;
  const visits = stats.visits === 1 ? 'its visit' : `all ${stats.visits} visits`;
  const warning =
    step === 'closed' ? null : (
      <View style={styles.warning} accessibilityRole="alert">
        <View style={styles.warningHead}>
          <View style={styles.warningSign}>
            <Icon name="warning" size={22} color={color.onBrand} />
          </View>
          <Txt variant="headline" color={color.dangerInk} style={styles.flex}>
            Delete all your collection data?
          </Txt>
        </View>
        <Txt variant="subhead" color={color.label}>
          {`This deletes ${cards} and ${visits}, with every rarity, gem and Foil rolled and every badge earned, ${
            signedIn ? 'on this device and on your account, so on your other devices too' : 'on this device'
          }. It can’t be undone: a gym you collect again rolls a new card.`}
        </Txt>
        {problem && (
          <Txt variant="footnote" color={color.dangerInk}>
            {problem}
          </Txt>
        )}
        <PrimaryButton label="Delete everything" icon="trash" tone="danger" busy={step === 'deleting'} onPress={() => void confirm()} />
        <PrimaryButton label="Keep my collection" tone="quiet" disabled={step === 'deleting'} onPress={close} />
      </View>
    );
  return { open: () => setStep('warning'), opened: step !== 'closed', warning, gyms: stats.gyms, visits: stats.visits };
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    sync: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2], padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    warning: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, borderWidth: 1.5, borderColor: color.dangerInk },
    warningHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    warningSign: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.dangerInk },
  }),
);
