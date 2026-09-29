import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBadge } from '@/components/BrandMark';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { color, radius, space, themed } from '@/lib/theme';

/**
 * Signed in, but the server can't be reached (it's down, or the phone is on
 * the gym's patchy Wi-Fi). You're not signed out, so there's nothing to sign
 * in to: just say so, and offer to try again. The app also retries by itself.
 * On Profile, and on Account opened meanwhile (a reload on the web, a link),
 * which has nothing else to show until the server answers.
 */
export function ServerAwayCard() {
  const { account } = useApp();
  const [trying, setTrying] = useState(false);
  const [tried, setTried] = useState(false);
  const retry = async () => {
    setTrying(true);
    await account.reconnect();
    // Back: this card is gone. Still away: say so, so the tap wasn't ignored.
    setTrying(false);
    setTried(true);
  };
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AppBadge size={52} />
        <View style={styles.flex}>
          <Txt variant="title2">Can’t reach GymGO</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            You’re still signed in. Your saved gyms on this device work, and the rest comes back when the server does.
          </Txt>
        </View>
      </View>
      <PrimaryButton label={trying ? 'Trying…' : 'Try again'} icon="refresh" tone="quiet" busy={trying} onPress={() => void retry()} />
      {tried && !trying && (
        <Txt variant="footnote" color={color.maybeInk}>
          Still no answer. GymGO keeps trying by itself every 20 seconds.
        </Txt>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[1] },
  flex: { flex: 1 },
}));
