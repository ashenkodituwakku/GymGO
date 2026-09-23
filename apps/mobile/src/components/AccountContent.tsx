/**
 * Your account: sign in or create one, your saved gyms, and, for moderators,
 * the reviews and photos waiting for a decision.
 *
 * Accounts live on the GymGO server on your own computer. Nothing is sent
 * anywhere else, and no email is sent to you: an email address here is just
 * a username that happens to be memorable.
 */

import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { GymRecord, Review } from '@gymgo/domain';
import { api, ApiError, OfflineError } from '@/lib/api';
import type { AccountApi } from '@/lib/useAccount';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space } from '@/lib/theme';
import { Icon } from './Icon';
import { PrimaryButton, TextField, Txt } from './ui';

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) {
    return 'Can’t reach the GymGO server. Start it on your computer with the gymgo command, then try again.';
  }
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Try again.';
}

export function AccountContent({
  account,
  records,
  inSheet,
  onOpenGym,
  onClose,
  onPhotosChanged,
}: {
  account: AccountApi;
  records: GymRecord[];
  inSheet: boolean;
  onOpenGym: (id: string) => void;
  onClose: () => void;
  /** A photo was published, so list thumbnails may have changed. */
  onPhotosChanged: () => void;
}) {
  if (account.state === 'signed_in' && account.account) {
    return <SignedIn account={account} records={records} onOpenGym={onOpenGym} onClose={onClose} onPhotosChanged={onPhotosChanged} />;
  }
  return <SignInForm account={account} inSheet={inSheet} />;
}

function SignInForm({ account, inSheet }: { account: AccountApi; inSheet: boolean }) {
  const [mode, setMode] = useState<'sign_in' | 'create'>('sign_in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') await account.signUp(name, email, password);
      else await account.signIn(email, password);
      haptic.success();
    } catch (caught) {
      haptic.warn();
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const ready = email.trim().length > 3 && password.length >= (mode === 'create' ? 8 : 1) && (mode === 'sign_in' || name.trim().length > 0);

  return (
    <View style={styles.wrap}>
      <Txt variant="title">{mode === 'create' ? 'Create your account' : 'Welcome back'}</Txt>
      <Txt variant="subhead" color={color.labelSecondary} style={styles.lede}>
        {mode === 'create'
          ? 'Save gyms on your phone and your PC, and write reviews.'
          : 'Sign in to see your saved gyms everywhere.'}
      </Txt>

      {account.state === 'unreachable' && (
        <Notice icon="offline" text="You’re signed in, but the GymGO server isn’t reachable right now. Your saved gyms on this device still work." />
      )}

      <View style={styles.form}>
        {mode === 'create' && (
          <TextField
            inSheet={inSheet}
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="What reviewers see"
            autoComplete="name"
            textContentType="name"
            maxLength={40}
          />
        )}
        <TextField
          inSheet={inSheet}
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          inSheet={inSheet}
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'}
          secureTextEntry
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          textContentType={mode === 'create' ? 'newPassword' : 'password'}
          onSubmitEditing={() => ready && void submit()}
        />
      </View>

      {error && <Notice icon="info" text={error} tone="danger" />}

      <PrimaryButton
        label={busy ? 'One moment…' : mode === 'create' ? 'Create account' : 'Sign in'}
        onPress={() => void submit()}
        disabled={!ready || busy}
      />

      <Pressable
        onPress={() => {
          haptic.select();
          setMode(mode === 'create' ? 'sign_in' : 'create');
          setError(null);
        }}
        accessibilityRole="button"
        style={styles.switch}
      >
        <Txt variant="subhead" color={color.brand} style={face('medium')}>
          {mode === 'create' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Txt>
      </Pressable>

      <Txt variant="caption" color={color.labelTertiary} style={styles.small}>
        Your account is stored on the GymGO server running on your computer. Passwords are stored hashed, never as
        typed. We don&apos;t send emails.
      </Txt>
    </View>
  );
}

function SignedIn({
  account,
  records,
  onOpenGym,
  onClose,
  onPhotosChanged,
}: {
  account: AccountApi;
  records: GymRecord[];
  onOpenGym: (id: string) => void;
  onClose: () => void;
  onPhotosChanged: () => void;
}) {
  const me = account.account!;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedGyms = account.saved
    .map((id) => records.find((record) => record.location.id === id))
    .filter((record): record is GymRecord => record !== undefined);
  const moderator = me.role === 'moderator' || me.role === 'admin';

  return (
    <View style={styles.wrap}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Txt variant="title2" color={color.onBrand}>
            {me.displayName.slice(0, 1).toUpperCase()}
          </Txt>
        </View>
        <View style={styles.flex}>
          <Txt variant="title2">{me.displayName}</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {me.email}
            {moderator ? ' · Moderator' : ''}
          </Txt>
        </View>
      </View>

      <Txt variant="headline" style={styles.heading}>
        Saved gyms
      </Txt>
      {savedGyms.length === 0 ? (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nothing saved yet. Tap Save on any gym and it shows up here, on your phone and your PC.
        </Txt>
      ) : (
        <View style={styles.list}>
          {savedGyms.map((record, index) => (
            <Pressable
              key={record.location.id}
              onPress={() => {
                onClose();
                onOpenGym(record.location.id);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && { backgroundColor: color.fill }]}
            >
              <View style={styles.flex}>
                <Txt variant="body" style={face('medium')}>
                  {record.location.name}
                  {record.location.branch ? ` ${record.location.branch}` : ''}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {record.location.address.suburb}
                  {record.location.isDemoData ? ' · demo' : ''}
                </Txt>
              </View>
              <Icon name="chevron" size={14} color={color.labelTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      {moderator && account.token && <PhotoQueue token={account.token} records={records} onPublished={onPhotosChanged} />}
      {moderator && account.token && <ModerationQueue token={account.token} records={records} />}

      {error && <Notice icon="info" text={error} tone="danger" />}

      <View style={styles.actions}>
        <PrimaryButton label="Sign out" tone="quiet" onPress={() => void account.signOut()} />
        <PrimaryButton
          label={confirmDelete ? 'Tap again to delete everything' : 'Delete account'}
          tone="danger"
          onPress={async () => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            try {
              await account.deleteAccount();
            } catch (caught) {
              setError(messageFor(caught));
            }
          }}
        />
      </View>
      <Txt variant="caption" color={color.labelTertiary} style={styles.small}>
        Deleting removes your account, saved gyms, reviews and photos from the server.
      </Txt>
    </View>
  );
}

function ModerationQueue({ token, records }: { token: string; records: GymRecord[] }) {
  const [queue, setQueue] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .moderationQueue(token)
      .then((data) => setQueue(data.reviews))
      .catch((caught: unknown) => setError(messageFor(caught)));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const decide = async (review: Review, decision: 'publish' | 'reject') => {
    try {
      await api.moderate(token, review.id, decision === 'reject' ? { decision, reason: 'Did not meet the review guidelines.' } : { decision });
      haptic.success();
      setQueue((current) => (current ?? []).filter((item) => item.id !== review.id));
    } catch (caught) {
      setError(messageFor(caught));
    }
  };

  return (
    <View>
      <Txt variant="headline" style={styles.heading}>
        Reviews waiting {queue ? `(${queue.length})` : ''}
      </Txt>
      {error && <Notice icon="info" text={error} tone="danger" />}
      {queue?.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nothing to moderate.
        </Txt>
      )}
      {queue?.map((review) => {
        const gym = records.find((record) => record.location.id === review.gymId);
        return (
          <View key={review.id} style={styles.queueItem}>
            <Txt variant="footnote" color={color.labelSecondary}>
              {gym ? gym.location.name : review.gymId} · {'★'.repeat(review.overall)} · {review.authorDisplayName}
            </Txt>
            <Txt variant="subhead">{review.body}</Txt>
            <View style={styles.queueButtons}>
              <View style={styles.flex}>
                <PrimaryButton label="Publish" onPress={() => void decide(review, 'publish')} />
              </View>
              <View style={styles.flex}>
                <PrimaryButton label="Reject" tone="danger" onPress={() => void decide(review, 'reject')} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Members' photos waiting for a moderator. Publish only a photo that shows
 * this gym and no one's face without their say-so; it will carry the
 * uploader's name.
 */
function PhotoQueue({ token, records, onPublished }: { token: string; records: GymRecord[]; onPublished: () => void }) {
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof api.photoQueue>>['photos'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .photoQueue(token)
      .then((data) => setQueue(data.photos))
      .catch((caught: unknown) => setError(messageFor(caught)));
  }, [token]);

  const decide = async (photoId: string, decision: 'publish' | 'reject') => {
    try {
      await api.moderatePhoto(token, photoId, decision === 'reject' ? { decision, reason: 'Did not meet the photo guidelines.' } : { decision });
      haptic.success();
      setQueue((current) => (current ?? []).filter((item) => item.id !== photoId));
      if (decision === 'publish') onPublished();
    } catch (caught) {
      setError(messageFor(caught));
    }
  };

  return (
    <View>
      <Txt variant="headline" style={styles.heading}>
        📷 Photos waiting {queue ? `(${queue.length})` : ''}
      </Txt>
      {error && <Notice icon="info" text={error} tone="danger" />}
      {queue?.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nothing to check.
        </Txt>
      )}
      {queue && queue.length > 0 && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.guide}>
          Publish it only if it shows that gym and no one who looks like they didn’t agree to be in it.
        </Txt>
      )}
      {queue?.map((photo) => {
        const gym = records.find((record) => record.location.id === photo.gymId);
        return (
          <View key={photo.id} style={styles.queueItem}>
            {photo.dataUrl ? (
              <Image source={{ uri: photo.dataUrl }} style={styles.queuePhoto} resizeMode="cover" />
            ) : (
              <Txt variant="footnote" color={color.labelSecondary}>
                The file is missing.
              </Txt>
            )}
            <Txt variant="footnote" color={color.labelSecondary}>
              {gym ? gym.location.name : photo.gymId} · by {photo.credit}
            </Txt>
            <View style={styles.queueButtons}>
              <View style={styles.flex}>
                <PrimaryButton label="Publish" onPress={() => void decide(photo.id, 'publish')} />
              </View>
              <View style={styles.flex}>
                <PrimaryButton label="Reject" tone="danger" onPress={() => void decide(photo.id, 'reject')} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function Notice({ icon, text, tone = 'brand' }: { icon: 'info' | 'offline'; text: string; tone?: 'brand' | 'danger' }) {
  return (
    <View style={[styles.notice, { backgroundColor: tone === 'danger' ? color.dangerTint : color.brandTint }]}>
      <Icon name={icon} size={15} color={tone === 'danger' ? color.dangerInk : color.brand} />
      <Txt variant="footnote" style={styles.flex}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space[4], paddingBottom: space[8], gap: space[4] },
  lede: { marginTop: -space[2] },
  form: { gap: space[3] },
  switch: { alignSelf: 'center', paddingVertical: space[2] },
  small: { textAlign: 'center' },
  flex: { flex: 1 },
  guide: { marginBottom: space[2] },
  queuePhoto: { width: '100%', height: 180, borderRadius: radius.md },

  profile: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { marginTop: space[2], marginBottom: space[2] },
  list: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  actions: { gap: space[2], marginTop: space[2] },

  queueItem: {
    gap: space[2],
    padding: space[3],
    marginBottom: space[2],
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  queueButtons: { flexDirection: 'row', gap: space[2] },

  notice: {
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'flex-start',
    padding: space[3],
    borderRadius: radius.md,
  },
});
