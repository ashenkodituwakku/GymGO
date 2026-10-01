/**
 * The gym's owner, on its page (apps/server/src/owners.ts):
 *
 * - When a verified owner runs it, a line says so, and which facts on the
 *   page are theirs (each also marked "From the gym" where it's shown).
 * - Anyone signed in can claim a gym they run; an admin checks before
 *   anything changes, and the claim's details are never shown publicly.
 * - The verified owner can send its visitor hours and casual visit price;
 *   a moderator approves each before it shows.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { reportCurrency, scheduleFor, type GymRecord, type OwnerUpdatePayload, type Tri } from '@gymgo/domain';
import { api, problemText, type GymOwnerView } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { DAY_NAMES, parsePrice, weekFrom, windowsFrom, type DayHours } from '@/lib/ownerForm';
import { moneyLabel } from '@/lib/places';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { ChoiceChip, Fold, Input, PrimaryButton, Txt } from './ui';

const KIND_LABEL: Record<OwnerUpdatePayload['kind'], string> = { visitor_hours: 'visitor hours', casual_price: 'casual visit price' };
const month = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export function GymOwner({ record, account, onSignIn }: { record: GymRecord; account: AccountApi; onSignIn: () => void }) {
  const location = record.location;
  const token = account.state === 'signed_in' ? account.token : null;
  const [view, setView] = useState<GymOwnerView | null>(null);
  const load = useCallback(() => {
    api
      .gymOwner(location.id, token)
      .then(setView)
      .catch(() => setView(null));
  }, [location.id, token]);
  useEffect(() => {
    if (!location.isDemoData) load();
  }, [load, location.isDemoData]);
  if (location.isDemoData || !view) return null;

  const owner = view.you?.owner === true;
  return (
    <Fold icon="key" title="The gym’s owner" summary={view.verified ? 'Verified owner' : owner ? 'You' : 'Run this gym? Claim it'}>
      {view.verified && (
        <View style={styles.verified}>
          <Icon name="good" size={18} color={color.goodInk} />
          <Txt variant="subhead" style={styles.flex}>
            {`A verified owner has run this listing since ${month(view.since!)}.`}
            {view.updates.length
              ? ` Its ${view.updates.map((update) => KIND_LABEL[update.kind]).join(' and ')} came from them, checked by GymGO before showing.`
              : ' Nothing on the page has come from them yet.'}
          </Txt>
        </View>
      )}
      {owner ? <OwnerTools record={record} token={token!} view={view} onSent={load} /> : <Claim gymName={location.name} gymId={location.id} token={token} view={view} onSignIn={onSignIn} onSent={load} />}
    </Fold>
  );
}

function Claim({ gymName, gymId, token, view, onSignIn, onSent }: { gymName: string; gymId: string; token: string | null; view: GymOwnerView; onSignIn: () => void; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [roleTitle, setRoleTitle] = useState('');
  const [contact, setContact] = useState('');
  const [evidence, setEvidence] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const claim = view.you?.claim ?? null;

  if (claim?.status === 'pending') {
    return (
      <Txt variant="footnote" color={color.labelSecondary}>
        Your claim is waiting to be checked. We’ll use the contact you gave, so keep an eye on it.
      </Txt>
    );
  }
  const send = async () => {
    if (!token) return;
    setSending(true);
    setNotice(null);
    try {
      await api.claimGym(token, gymId, { roleTitle, contact, evidence });
      haptic.success();
      setOpen(false);
      onSent();
    } catch (error) {
      haptic.warn();
      setNotice(problemText(error));
    } finally {
      setSending(false);
    }
  };
  return (
    <View style={styles.form}>
      {claim?.status === 'rejected' && (
        <Txt variant="footnote" color={color.noInk}>
          {`Your last claim wasn’t approved: ${claim.reason ?? 'no reason given'}`}
        </Txt>
      )}
      <Txt variant="footnote" color={color.labelSecondary}>
        {view.verified
          ? `Also run ${gymName}? Claim it too, and we’ll check just as carefully. We never show your details.`
          : `Own or manage ${gymName}? Once we’ve checked, you can keep its visitor hours and casual price right here, marked as from the gym. We never show your details.`}
      </Txt>
      {!open ? (
        <PrimaryButton label={token ? 'Claim this gym' : 'Sign in to claim this gym'} icon="key" tone="quiet" onPress={() => (token ? setOpen(true) : onSignIn())} />
      ) : (
        <>
          <Input value={roleTitle} onChangeText={setRoleTitle} placeholder="Your role: owner, manager…" maxLength={80} accessibilityLabel="Your role at the gym" style={styles.input} />
          <Input
            value={contact}
            onChangeText={setContact}
            placeholder="Work email at the gym’s address, or its listed phone"
            maxLength={160}
            autoCapitalize="none"
            accessibilityLabel="How to reach you at the gym"
            style={styles.input}
          />
          <Input
            value={evidence}
            onChangeText={setEvidence}
            placeholder="How can we check? A staff page, ABN or company record…"
            maxLength={1000}
            multiline
            accessibilityLabel="How we can check it’s yours"
            style={[styles.input, styles.tall]}
          />
          {notice && (
            <Txt variant="footnote" color={color.noInk}>
              {notice}
            </Txt>
          )}
          <PrimaryButton label="Send claim" busy={sending} onPress={() => void send()} />
          <PrimaryButton label="Cancel" tone="quiet" onPress={() => setOpen(false)} />
        </>
      )}
    </View>
  );
}

const TRI: Array<{ value: Tri; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Rather not say' },
];

function OwnerTools({ record, token, view, onSent }: { record: GymRecord; token: string; view: GymOwnerView; onSent: () => void }) {
  const location = record.location;
  const country = location.address.countryCode;
  const [part, setPart] = useState<'hours' | 'price' | null>(null);
  const [week, setWeek] = useState<DayHours[]>(() => weekFrom(scheduleFor(record, 'visitor')));
  const [allDay, setAllDay] = useState(scheduleFor(record, 'visitor')?.alwaysOpen === true);
  const [price, setPrice] = useState('');
  const [anyone, setAnyone] = useState<Tri>('unknown');
  const [photoId, setPhotoId] = useState<Tri>('unknown');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const send = async (body: Record<string, unknown>) => {
    setSending(true);
    setNotice(null);
    try {
      await api.submitOwnerUpdate(token, location.id, body);
      haptic.success();
      setPart(null);
      setNotice('Sent. A moderator checks it before it shows, usually within a day.');
      onSent();
    } catch (error) {
      haptic.warn();
      setNotice(problemText(error));
    } finally {
      setSending(false);
    }
  };
  const sendHours = () => {
    if (allDay) return void send({ kind: 'visitor_hours', alwaysOpen: true, windows: [] });
    const result = windowsFrom(week);
    if ('problem' in result) return setNotice(result.problem);
    void send({ kind: 'visitor_hours', alwaysOpen: false, windows: result.windows });
  };
  const sendPrice = () => {
    const amountMinor = parsePrice(price);
    if (amountMinor === null) return setNotice('Write the price like 25 or 12.50.');
    void send({ kind: 'casual_price', amountMinor, anyoneCanBuy: anyone, photoIdRequired: photoId });
  };

  return (
    <View style={styles.form}>
      <Txt variant="footnote" color={color.labelSecondary}>
        You’re this gym’s verified owner. Keep its visitor hours and casual price up to date: each is checked by a moderator, then shown as from the gym.
      </Txt>
      {view.you!.submissions.slice(0, 4).map((item) => (
        <Txt key={item.id} variant="caption" color={item.status === 'rejected' ? color.noInk : color.labelSecondary}>
          {`${KIND_LABEL[item.payload.kind]}: ${item.status === 'pending' ? 'waiting for a moderator' : item.status === 'approved' ? 'showing' : `not approved (${item.reason ?? 'no reason given'})`}`}
        </Txt>
      ))}
      {notice && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {notice}
        </Txt>
      )}
      {part === null && (
        <View style={styles.row}>
          <View style={styles.flex}>
            <PrimaryButton label="Visitor hours" icon="clock" tone="quiet" onPress={() => setPart('hours')} />
          </View>
          {reportCurrency(country) && (
            <View style={styles.flex}>
              <PrimaryButton label="Casual price" icon="money" tone="quiet" onPress={() => setPart('price')} />
            </View>
          )}
        </View>
      )}
      {part === 'hours' && (
        <View style={styles.form}>
          <View style={styles.row}>
            <Txt variant="subhead" style={styles.flex}>
              Open to visitors round the clock
            </Txt>
            <Switch value={allDay} onValueChange={setAllDay} accessibilityLabel="Open to visitors round the clock" trackColor={{ true: color.brand, false: color.fill }} />
          </View>
          {!allDay &&
            week.map((day, index) => (
              <View key={DAY_NAMES[index]} style={styles.day}>
                <Pressable
                  onPress={() => setWeek(week.map((item, at) => (at === index ? { ...item, open: !item.open } : item)))}
                  accessibilityRole="checkbox"
                  aria-checked={day.open}
                  accessibilityLabel={`${DAY_NAMES[index]}: ${day.open ? 'open to visitors' : 'closed to visitors'}`}
                  style={styles.dayName}
                >
                  <Icon name={day.open ? 'done' : 'todo'} size={18} color={day.open ? color.brand : color.labelTertiary} />
                  <Txt variant="subhead" style={face('semibold')}>
                    {DAY_NAMES[index]!.slice(0, 3)}
                  </Txt>
                </Pressable>
                {day.open ? (
                  <>
                    <Input value={day.from} onChangeText={(from) => setWeek(week.map((item, at) => (at === index ? { ...item, from } : item)))} accessibilityLabel={`${DAY_NAMES[index]} opens`} style={styles.time} maxLength={5} />
                    <Txt variant="footnote" color={color.labelSecondary}>
                      to
                    </Txt>
                    <Input value={day.to} onChangeText={(to) => setWeek(week.map((item, at) => (at === index ? { ...item, to } : item)))} accessibilityLabel={`${DAY_NAMES[index]} closes`} style={styles.time} maxLength={5} />
                  </>
                ) : (
                  <Txt variant="footnote" color={color.labelSecondary}>
                    No visitors
                  </Txt>
                )}
              </View>
            ))}
          <Txt variant="caption" color={color.labelSecondary}>
            The hours a visitor can walk in, not members’ 24/7 door. A close earlier than the open runs past midnight.
          </Txt>
          <PrimaryButton label="Send visitor hours" busy={sending} onPress={sendHours} />
          <PrimaryButton label="Cancel" tone="quiet" onPress={() => setPart(null)} />
        </View>
      )}
      {part === 'price' && (
        <View style={styles.form}>
          <Input value={price} onChangeText={setPrice} placeholder={`One casual visit, e.g. ${moneyLabel(2500, country)}`} keyboardType="decimal-pad" accessibilityLabel="Casual visit price" style={styles.input} />
          <Txt variant="caption" color={color.labelSecondary}>
            The whole price: tax and any must-pay fee included.
          </Txt>
          <Txt variant="subhead">Can anyone buy it (not only locals or members’ guests)?</Txt>
          <View style={styles.chips}>
            {TRI.map((option) => (
              <ChoiceChip key={option.value} label={option.label} selected={anyone === option.value} onPress={() => setAnyone(option.value)} />
            ))}
          </View>
          <Txt variant="subhead">Is photo ID needed?</Txt>
          <View style={styles.chips}>
            {TRI.map((option) => (
              <ChoiceChip key={option.value} label={option.label} selected={photoId === option.value} onPress={() => setPhotoId(option.value)} />
            ))}
          </View>
          <PrimaryButton label="Send price" busy={sending} onPress={sendPrice} />
          <PrimaryButton label="Cancel" tone="quiet" onPress={() => setPart(null)} />
        </View>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    verified: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.goodTint },
    form: { gap: space[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    input: { minHeight: 44, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 16 },
    tall: { minHeight: 80, textAlignVertical: 'top' },
    day: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    dayName: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 72 },
    time: { width: 72, height: 40, paddingHorizontal: space[2], borderRadius: radius.sm, backgroundColor: color.fill, color: color.label, fontSize: 16, textAlign: 'center' },
  }),
);
