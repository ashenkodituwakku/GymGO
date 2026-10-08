/**
 * Moderation on the phone: one tap to approve, two to turn something down
 * with a reason (Reject, then the reason), and the queues for verified
 * owners: their submissions (moderators) and gym claims (admins only, as
 * claims hold personal details).
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DAY_NAMES } from '@/lib/ownerForm';
import { api, problemText, type ClaimItem, type OwnerUpdateItem } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { timeLabel } from '@/lib/copy';
import { priceLabel, type GymRecord, type OwnerUpdatePayload } from '@gymgo/domain';
import { color, face, radius, space, themed } from '@/lib/theme';
import { ChoiceChip, PrimaryButton, Txt } from './ui';

/** Approve in one tap; Reject opens the reasons, and a reason sends it. */
export function DecideButtons({
  approveLabel = 'Approve',
  reasons,
  onApprove,
  onReject,
}: {
  approveLabel?: string;
  reasons: readonly string[];
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  if (rejecting) {
    return (
      <View style={styles.reasons}>
        <Txt variant="footnote" color={color.labelSecondary}>
          Why? The person sees this.
        </Txt>
        <View style={styles.chips}>
          {reasons.map((reason) => (
            <ChoiceChip key={reason} label={reason} selected={false} onPress={() => onReject(reason)} />
          ))}
          <ChoiceChip label="Cancel" selected={false} onPress={() => setRejecting(false)} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.buttons}>
      <View style={styles.flex}>
        <PrimaryButton label={approveLabel} onPress={onApprove} />
      </View>
      <View style={styles.flex}>
        <PrimaryButton label="Reject" tone="danger" onPress={() => setRejecting(true)} />
      </View>
    </View>
  );
}

export const REVIEW_REASONS = ['Not about a visit', 'Rude, hateful or personal', 'Spam or advertising', 'Breaks the community guidelines'] as const;
export const PHOTO_REASONS = ['Not this gym', 'Shows people who may not have agreed', 'Blurry or misleading', 'Breaks the community guidelines'] as const;
const UPDATE_REASONS = ['Doesn’t match the gym’s own website', 'Looks mistyped', 'Needs a source we can check'] as const;
const CLAIM_REASONS = ['Couldn’t confirm you run it', 'The contact isn’t the gym’s', 'Not enough to go on'] as const;

/** What an owner sent, in a line or two. */
export function describeUpdate(payload: OwnerUpdatePayload): string {
  if (payload.kind === 'casual_price') {
    const who = payload.anyoneCanBuy === 'yes' ? 'anyone can buy' : payload.anyoneCanBuy === 'no' ? 'not open to everyone' : 'who can buy not said';
    return `Casual visit ${priceLabel(payload.amountMinor, payload.currency)} · ${who} · photo ID ${payload.photoIdRequired === 'unknown' ? 'not said' : payload.photoIdRequired}`;
  }
  if (payload.alwaysOpen) return 'Visitor hours: round the clock';
  return `Visitor hours: ${payload.windows.map((window) => `${DAY_NAMES[window.day]!.slice(0, 3)} ${timeLabel(window.openMinute)}–${timeLabel(window.closeMinute % 1440)}`).join(', ')}`;
}

export function OwnerUpdateQueue({ token, records, onChanged }: { token: string; records: GymRecord[]; onChanged?: () => void }) {
  const [queue, setQueue] = useState<OwnerUpdateItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .ownerUpdateQueue(token)
      .then((data) => setQueue(data.updates))
      .catch((caught: unknown) => setError(problemText(caught)));
  }, [token]);
  const decide = async (item: OwnerUpdateItem, decision: 'approve' | 'reject', reason?: string) => {
    try {
      await api.decideOwnerUpdate(token, item.id, reason ? { decision, reason } : { decision });
      haptic.success();
      setQueue((current) => (current ?? []).filter((other) => other.id !== item.id));
      onChanged?.();
    } catch (caught) {
      setError(problemText(caught));
    }
  };
  return (
    <View style={styles.queue}>
      <Txt variant="headline">{`Owners’ updates waiting ${queue ? `(${queue.length})` : ''}`}</Txt>
      {error && (
        <Txt variant="footnote" color={color.noInk}>
          {error}
        </Txt>
      )}
      {queue?.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nothing to check.
        </Txt>
      )}
      {queue?.map((item) => {
        const gym = records.find((record) => record.location.id === item.gymId);
        return (
          <View key={item.id} style={styles.item}>
            <Txt variant="footnote" color={color.labelSecondary}>
              {`${gym?.location.name ?? item.gymId} · from its verified owner, ${item.displayName}`}
            </Txt>
            <Txt variant="subhead">{describeUpdate(item.payload)}</Txt>
            <Txt variant="caption" color={color.labelSecondary}>
              Check it against the gym’s own website or a call before approving: it shows as from the gym.
            </Txt>
            <DecideButtons reasons={UPDATE_REASONS} onApprove={() => void decide(item, 'approve')} onReject={(reason) => void decide(item, 'reject', reason)} />
          </View>
        );
      })}
    </View>
  );
}

export function ClaimQueue({ token, records }: { token: string; records: GymRecord[] }) {
  const [queue, setQueue] = useState<ClaimItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .claimQueue(token)
      .then((data) => setQueue(data.claims))
      .catch((caught: unknown) => setError(problemText(caught)));
  }, [token]);
  const decide = async (item: ClaimItem, decision: 'approve' | 'reject', reason?: string) => {
    try {
      await api.decideClaim(token, item.id, reason ? { decision, reason } : { decision });
      haptic.success();
      setQueue((current) => (current ?? []).filter((other) => other.id !== item.id));
    } catch (caught) {
      setError(problemText(caught));
    }
  };
  return (
    <View style={styles.queue}>
      <Txt variant="headline">{`Gym claims waiting ${queue ? `(${queue.length})` : ''}`}</Txt>
      {error && (
        <Txt variant="footnote" color={color.noInk}>
          {error}
        </Txt>
      )}
      {queue?.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nothing to check.
        </Txt>
      )}
      {queue?.map((item) => {
        const gym = records.find((record) => record.location.id === item.gymId);
        return (
          <View key={item.id} style={styles.item}>
            <Txt variant="subhead" style={face('semibold')}>
              {`${item.displayName}, ${item.roleTitle} at ${gym?.location.name ?? item.gymId}`}
            </Txt>
            <Txt variant="footnote">{`Account: ${item.email}`}</Txt>
            <Txt variant="footnote">{`Contact: ${item.contact}`}</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              {item.evidence}
            </Txt>
            <Txt variant="caption" color={color.labelSecondary}>
              {`Check before approving: the contact should be the gym’s own (its website’s domain, or the phone it lists${gym?.location.phone ? `: ${gym.location.phone}` : ''}). Approving lets them send its hours and price.`}
            </Txt>
            <DecideButtons reasons={CLAIM_REASONS} onApprove={() => void decide(item, 'approve')} onReject={(reason) => void decide(item, 'reject', reason)} />
          </View>
        );
      })}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    buttons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
    reasons: { gap: space[2], marginTop: space[1] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    queue: { gap: space[2] },
    item: { gap: space[1], padding: space[3], borderRadius: radius.md, backgroundColor: color.fill },
  }),
);
