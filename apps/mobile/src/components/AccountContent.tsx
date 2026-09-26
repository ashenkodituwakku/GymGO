/**
 * For moderators, on the Profile tab: the reviews, photos and members'
 * reports waiting for a decision. (Signing in is app/sign-in.tsx; your
 * account's settings are app/account.tsx.)
 *
 * Accounts live on the GymGO server on your own computer. Nothing is sent
 * anywhere else, and no email is sent to you: an email address here is just
 * a username that happens to be memorable.
 */

import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { serverOfflineLine } from '@/lib/copy';
import { priceLabel, type GymRecord, type Review } from '@gymgo/domain';
import { api, ApiError, OfflineError, type AccessOutcome, type BugReportItem, type MemberReport } from '@/lib/api';
import { moneyLabel } from '@/lib/places';
import type { AccountApi } from '@/lib/useAccount';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { PrimaryButton, TextField, Txt } from './ui';

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) {
    return serverOfflineLine(Platform.OS);
  }
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Try again.';
}

export function ModerationQueue({ token, records, onPublished }: { token: string; records: GymRecord[]; onPublished?: () => void }) {
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
      // A published review changes the gym's rating in lists and cards.
      if (decision === 'publish') onPublished?.();
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

const OUTCOME_LABEL: Record<AccessOutcome | 'closed' | 'open', string> = {
  walked_in: 'walked in',
  booked_first: 'had to book first',
  turned_away: 'turned away',
  closed: 'says it has closed',
  open: 'says it’s still open',
};

/**
 * Members' price, visit and open-or-closed reports show straight away, so moderators look
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
        Latest member reports {reports ? `(${reports.length})` : ''}
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
            ? `paid ${report.currency ? priceLabel(report.amountMinor, report.currency) : moneyLabel(report.amountMinor, '')} for a visit`
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

const BUG_STATUS: Record<BugReportItem['status'], string> = { sent: 'Emailed', pending: 'Not emailed yet', failed: 'Couldn’t be emailed' };

/**
 * Bug reports from the app, newest first. They're emailed to the team when
 * the server has email set up; this is where they can always be read.
 */
export function BugReportQueue({ token }: { token: string }) {
  const [data, setData] = useState<{ emailing: boolean; reports: BugReportItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api
      .bugReports(token)
      .then(setData)
      .catch((caught: unknown) => setError(messageFor(caught)));
  }, [token]);

  return (
    <View>
      <Txt variant="headline" style={styles.heading}>
        Bug reports {data ? `(${data.reports.length})` : ''}
      </Txt>
      {error && <Notice icon="info" text={error} tone="danger" />}
      {data && !data.emailing && <Notice icon="info" text="This server doesn’t email reports yet (no GYMGO_SMTP_URL set), so they’re only here." />}
      {data?.reports.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          No reports yet.
        </Txt>
      )}
      {data?.reports.map((report) => {
        const expanded = open === report.id;
        return (
          <Pressable
            key={report.id}
            onPress={() => setOpen(expanded ? null : report.id)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            aria-expanded={expanded}
            style={styles.queueItem}
          >
            <Txt variant="footnote" color={color.labelSecondary}>
              {new Date(report.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} ·{' '}
              {report.reporter?.displayName ?? 'Not signed in'} · {BUG_STATUS[report.status]}
            </Txt>
            <Txt variant="subhead" numberOfLines={expanded ? undefined : 3}>
              {report.description}
            </Txt>
            {expanded && (
              <View style={styles.bugDetails}>
                {report.replyTo && (
                  <Txt variant="footnote" color={color.labelSecondary}>
                    Reply to {report.replyTo}
                  </Txt>
                )}
                {report.context.map((line) => (
                  <Txt key={line.label} variant="footnote" color={color.labelSecondary}>
                    {line.label}: {line.value}
                  </Txt>
                ))}
                {report.lastError && report.status !== 'sent' && (
                  <Txt variant="footnote" color={color.dangerInk}>
                    Email problem: {report.lastError}
                  </Txt>
                )}
              </View>
            )}
          </Pressable>
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

const styles = themed(() => StyleSheet.create({
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
    backgroundColor: color.brandFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { marginTop: space[2], marginBottom: space[2] },
  list: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.cardGlass,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  actions: { gap: space[2], marginTop: space[2] },

  bugDetails: { gap: 2, marginTop: space[1] },
  queueItem: {
    gap: space[2],
    padding: space[3],
    marginBottom: space[2],
    borderRadius: radius.md,
    backgroundColor: color.cardGlass,
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
}));
