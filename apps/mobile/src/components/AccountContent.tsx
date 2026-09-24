/**
 * The account pieces the Profile tab is made of: the sign-in / create-account
 * form, and, for moderators, the reviews and photos waiting for a decision.
 *
 * Accounts live on the GymGO server on your own computer. Nothing is sent
 * anywhere else, and no email is sent to you: an email address here is just
 * a username that happens to be memorable.
 */

import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { GymRecord, Review } from '@gymgo/domain';
import { api, ApiError, OfflineError, type AccessOutcome, type MemberReport } from '@/lib/api';
import { moneyLabel } from '@/lib/places';
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

export function SignInForm({ account, inSheet }: { account: AccountApi; inSheet: boolean }) {
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

      <Txt variant="caption" color={color.labelSecondary} style={styles.small}>
        Your account is stored on the GymGO server running on your computer. Passwords are stored hashed, never as
        typed. We don&apos;t send emails.
      </Txt>
    </View>
  );
}

export function ModerationQueue({ token, records }: { token: string; records: GymRecord[] }) {
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

/** Change your name or password, one small form at a time. */
export function AccountSettings({ account }: { account: AccountApi }) {
  const [editing, setEditing] = useState<'name' | 'password' | null>(null);
  const [name, setName] = useState(account.account?.displayName ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'good' | 'danger' } | null>(null);

  const open = (which: 'name' | 'password') => {
    setNotice(null);
    setName(account.account?.displayName ?? '');
    setCurrent('');
    setNext('');
    setEditing((shown) => (shown === which ? null : which));
  };
  const run = async (work: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await work();
      haptic.success();
      setEditing(null);
      setNotice({ text: done, tone: 'good' });
    } catch (caught) {
      haptic.warn();
      setNotice({ text: messageFor(caught), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.settings}>
      <View style={styles.queueButtons}>
        <View style={styles.flex}>
          <PrimaryButton label="Change name" tone="quiet" onPress={() => open('name')} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Change password" tone="quiet" onPress={() => open('password')} />
        </View>
      </View>
      {editing === 'name' && (
        <View style={styles.settings}>
          <TextField label="Your name, as others see it" value={name} onChangeText={setName} autoComplete="name" inSheet={false} maxLength={40} />
          <PrimaryButton
            label={busy ? 'Saving…' : 'Save name'}
            disabled={busy || !name.trim()}
            onPress={() => void run(() => account.rename(name), 'Name changed.')}
          />
        </View>
      )}
      {editing === 'password' && (
        <View style={styles.settings}>
          <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" inSheet={false} />
          <TextField label="New password (8 characters or more)" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" inSheet={false} />
          <PrimaryButton
            label={busy ? 'Saving…' : 'Save password'}
            disabled={busy || !current || next.length < 8}
            onPress={() => void run(() => account.changePassword(current, next), 'Password changed. Any other device signed in as you has been signed out.')}
          />
        </View>
      )}
      {notice && <Notice icon="info" text={notice.text} tone={notice.tone === 'good' ? 'brand' : 'danger'} />}
    </View>
  );
}

const OUTCOME_LABEL: Record<AccessOutcome, string> = { walked_in: 'walked in', booked_first: 'had to book first', turned_away: 'turned away' };

/**
 * Members' price and visit reports show straight away, so moderators look
 * over the latest and remove any that are wrong or abusive.
 */
export function MemberReportQueue({ token, records }: { token: string; records: GymRecord[] }) {
  const [reports, setReports] = useState<MemberReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .memberReports(token)
      .then((data) => setReports(data.reports))
      .catch((caught: unknown) => setError(messageFor(caught)));
  }, [token]);

  const remove = async (report: MemberReport) => {
    try {
      await api.removeMemberReport(token, report);
      haptic.success();
      setReports((current) => (current ?? []).filter((item) => !(item.kind === report.kind && item.gymId === report.gymId && item.userId === report.userId)));
    } catch (caught) {
      setError(messageFor(caught));
    }
  };

  return (
    <View>
      <Txt variant="headline" style={styles.heading}>
        Latest price and visit reports {reports ? `(${reports.length})` : ''}
      </Txt>
      {error && <Notice icon="info" text={error} tone="danger" />}
      {reports?.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          No reports yet.
        </Txt>
      )}
      {reports?.map((report) => {
        const gym = records.find((record) => record.location.id === report.gymId);
        const what =
          report.kind === 'price' && report.amountMinor !== null
            ? `paid ${moneyLabel(report.amountMinor, report.currency === 'USD' ? 'US' : 'AU')} for a visit`
            : `${report.outcome ? OUTCOME_LABEL[report.outcome] : 'visited'}`;
        return (
          <View key={`${report.kind}-${report.gymId}-${report.userId}`} style={styles.queueItem}>
            <Txt variant="footnote" color={color.labelSecondary}>
              {gym ? gym.location.name : report.gymId} · {report.author} · {new Date(report.on).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </Txt>
            <Txt variant="subhead">{what}</Txt>
            <PrimaryButton label="Remove" tone="danger" onPress={() => void remove(report)} />
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
export function PhotoQueue({ token, records, onPublished }: { token: string; records: GymRecord[]; onPublished: () => void }) {
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
        Photos waiting {queue ? `(${queue.length})` : ''}
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
  settings: { gap: space[2] },

  notice: {
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'flex-start',
    padding: space[3],
    borderRadius: radius.md,
  },
});
