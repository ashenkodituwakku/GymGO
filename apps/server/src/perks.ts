/**
 * Gift Pro, Duo and partner day passes (domain perks.ts; the routes are in
 * app.ts). Stripe takes the money (billing.ts payOnce and checkout); this
 * keeps what was bought and who it's for.
 *
 * - Gift Pro: paying makes a gift code (once per checkout, whichever of the
 *   webhook or the return page says so first), shown to the buyer. Whoever
 *   redeems it gets a year of Pro, after any gift still running.
 * - Duo: a Duo subscriber adds one person by their friend code; that person
 *   is Pro for as long as the Duo subscription is. Either can end it.
 * - Partner day passes: only an admin adds one, once GymGO has an agreement
 *   with the gym. Booking makes a pending booking and a checkout with the
 *   pass and GymGO's fee as separate lines; paying gives a pass code to
 *   show at reception.
 *
 * Deleting an account removes its grants, Duo place and bookings (they
 * cascade); a gift code it bought but nobody redeemed stays redeemable.
 */

import { randomUUID } from 'node:crypto';
import {
  formatFriendCode,
  formatGiftCode,
  giftPeriod,
  makeGiftCode,
  normaliseFriendCode,
  normaliseGiftCode,
  passTotal,
  type BillingCurrency,
} from '@gymgo/domain';
import type { Billing, ProGrant, StripeCheckoutSession } from './billing';
import type { Db } from './db';

export class PerkError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface PartnerPass {
  id: string;
  gymId: string;
  label: string;
  priceMinor: number;
  feeMinor: number;
  currency: BillingCurrency;
}

type PassRow = { id: string; gym_id: string; label: string; price_minor: number; fee_minor: number; currency: BillingCurrency; active: number };
const passView = (row: PassRow): PartnerPass => ({ id: row.id, gymId: row.gym_id, label: row.label, priceMinor: row.price_minor, feeMinor: row.fee_minor, currency: row.currency });

export class Perks {
  private billing: Billing | null = null;

  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  /** Billing and perks need each other: billing asks who has Pro by a perk; perks ask who subscribes. */
  attach(billing: Billing): void {
    this.billing = billing;
  }

  private get subscriptions(): Billing {
    if (!this.billing) throw new Error('Perks used before billing was attached');
    return this.billing;
  }

  // --- Who is Pro by a perk ----------------------------------------------------------

  private giftUntil(userId: string): string | null {
    const row = this.db.prepare(`select max(ends_at) as ends from pro_grants where user_id = ? and source = 'gift' and ends_at > ?`).get(userId, this.now().toISOString()) as {
      ends: string | null;
    };
    return row.ends;
  }

  /** For billing.planFor: a gift running now, or a place on a Duo whose subscriber still pays. */
  grantFor(userId: string): ProGrant | null {
    const gift = this.giftUntil(userId);
    if (gift) return { via: 'gift', endsAt: gift, from: null };
    const duo = this.db.prepare('select d.owner_user_id, u.display_name from duo_members d join users u on u.id = d.owner_user_id where d.member_user_id = ?').get(userId) as
      | { owner_user_id: string; display_name: string }
      | undefined;
    if (duo && this.subscriptions.subscribed(duo.owner_user_id).duo) return { via: 'duo', endsAt: null, from: duo.display_name };
    return null;
  }

  // --- Gift Pro -----------------------------------------------------------------------

  /** A paid checkout came back: a gift code, or a day pass marked paid. Safe to call more than once. */
  fulfil(session: StripeCheckoutSession): void {
    const kind = session.metadata?.gymgo_kind;
    const buyer = session.metadata?.gymgo_account_id ?? session.client_reference_id;
    if (kind === 'gift' && buyer) {
      if (this.db.prepare('select 1 from gift_codes where checkout_session_id = ?').get(session.id)) return;
      for (let attempt = 0; attempt < 10; attempt++) {
        const code = makeGiftCode(this.random);
        if (this.db.prepare('select 1 from gift_codes where code = ?').get(code)) continue;
        const buyerExists = this.db.prepare('select 1 from users where id = ?').get(buyer);
        this.db
          .prepare('insert into gift_codes (code, buyer_user_id, checkout_session_id, currency, created_at) values (?, ?, ?, ?, ?)')
          .run(code, buyerExists ? buyer : null, session.id, session.metadata?.gymgo_currency ?? null, this.now().toISOString());
        return;
      }
      throw new Error('Could not make a unique gift code');
    }
    if (kind === 'pass') {
      const bookingId = session.metadata?.gymgo_booking_id;
      if (!bookingId) return;
      const booking = this.db.prepare(`select status from pass_bookings where id = ? and checkout_session_id = ?`).get(bookingId, session.id) as { status: string } | undefined;
      if (!booking || booking.status === 'paid') return;
      this.db.prepare(`update pass_bookings set status = 'paid', code = ?, paid_at = ? where id = ?`).run(makeGiftCode(this.random).slice(0, 8), this.now().toISOString(), bookingId);
    }
  }

  /** Gift codes you bought, newest first, and whether they've been used. */
  giftsBoughtBy(userId: string): Array<{ code: string; createdAt: string; redeemed: boolean; redeemedAt: string | null }> {
    return (
      this.db.prepare('select code, created_at, redeemed_at from gift_codes where buyer_user_id = ? order by created_at desc').all(userId) as Array<{
        code: string;
        created_at: string;
        redeemed_at: string | null;
      }>
    ).map((row) => ({ code: formatGiftCode(row.code), createdAt: row.created_at, redeemed: row.redeemed_at !== null, redeemedAt: row.redeemed_at }));
  }

  /** Redeem a gift: a year of Pro, after any gift still running. */
  redeem(userId: string, typed: string): { endsAt: string } {
    const code = normaliseGiftCode(typed);
    if (!code) throw new PerkError(400, 'A gift code is 12 letters and numbers, like K7QM-2XPH-9RTA.');
    const gift = this.db.prepare('select code, redeemed_at from gift_codes where code = ?').get(code) as { code: string; redeemed_at: string | null } | undefined;
    if (!gift) throw new PerkError(404, 'That code isn’t one of ours. Check it with whoever gave it to you?');
    if (gift.redeemed_at) throw new PerkError(409, 'That code has been used already.');
    if (this.subscriptions.subscribed(userId).pro) throw new PerkError(409, 'You already pay for GymGO Pro, so this would be wasted. Pass the code on to someone else.');
    const period = giftPeriod(this.now(), this.giftUntil(userId));
    this.db.exec('begin');
    try {
      const taken = this.db.prepare('update gift_codes set redeemed_by = ?, redeemed_at = ? where code = ? and redeemed_at is null').run(userId, this.now().toISOString(), code);
      if (taken.changes === 0) throw new PerkError(409, 'That code has been used already.');
      this.db
        .prepare(`insert into pro_grants (id, user_id, source, starts_at, ends_at, ref, created_at) values (?, ?, 'gift', ?, ?, ?, ?)`)
        .run(randomUUID(), userId, period.startsAt, period.endsAt, code, this.now().toISOString());
      this.db.exec('commit');
    } catch (error) {
      this.db.exec('rollback');
      throw error;
    }
    return { endsAt: period.endsAt };
  }

  // --- Duo ----------------------------------------------------------------------------

  duoView(userId: string): { role: 'owner' | 'member' | null; partner: { displayName: string } | null; canAdd: boolean } {
    const asOwner = this.db.prepare('select u.display_name from duo_members d join users u on u.id = d.member_user_id where d.owner_user_id = ?').get(userId) as
      | { display_name: string }
      | undefined;
    const ownsDuo = this.subscriptions.subscribed(userId).duo;
    if (asOwner) return { role: 'owner', partner: { displayName: asOwner.display_name }, canAdd: ownsDuo };
    const asMember = this.db.prepare('select u.display_name from duo_members d join users u on u.id = d.owner_user_id where d.member_user_id = ?').get(userId) as
      | { display_name: string }
      | undefined;
    if (asMember) return { role: 'member', partner: { displayName: asMember.display_name }, canAdd: false };
    return { role: ownsDuo ? 'owner' : null, partner: null, canAdd: ownsDuo };
  }

  /** A Duo subscriber adds (or swaps in) their one more person, by that person's friend code. */
  addToDuo(ownerId: string, typed: string): { displayName: string } {
    if (!this.subscriptions.subscribed(ownerId).duo) throw new PerkError(403, 'Adding someone needs a GymGO Pro Duo subscription.');
    const code = normaliseFriendCode(typed);
    if (!code) throw new PerkError(400, 'Use their friend code, like K7QM-2XPH (it’s on their Friends screen).');
    const found = this.db.prepare('select f.user_id, u.display_name from friend_codes f join users u on u.id = f.user_id where f.code = ?').get(code) as
      | { user_id: string; display_name: string }
      | undefined;
    if (!found) throw new PerkError(404, `No one has the code ${formatFriendCode(code)}.`);
    if (found.user_id === ownerId) throw new PerkError(400, 'That’s your own code. Add someone else.');
    if (this.subscriptions.subscribed(found.user_id).pro) throw new PerkError(409, `${found.display_name} already pays for Pro.`);
    const elsewhere = this.db.prepare('select owner_user_id from duo_members where member_user_id = ?').get(found.user_id) as { owner_user_id: string } | undefined;
    if (elsewhere && elsewhere.owner_user_id !== ownerId) throw new PerkError(409, `${found.display_name} is already on someone else’s Duo.`);
    this.db
      .prepare('insert into duo_members (owner_user_id, member_user_id, added_at) values (?, ?, ?) on conflict (owner_user_id) do update set member_user_id = excluded.member_user_id, added_at = excluded.added_at')
      .run(ownerId, found.user_id, this.now().toISOString());
    return { displayName: found.display_name };
  }

  /** The subscriber takes their person off, or the person leaves. */
  leaveDuo(userId: string): void {
    this.db.prepare('delete from duo_members where owner_user_id = ? or member_user_id = ?').run(userId, userId);
  }

  // --- Partner day passes ---------------------------------------------------------------

  passesAt(gymId: string): PartnerPass[] {
    return (this.db.prepare('select * from partner_passes where gym_id = ? and active = 1 order by price_minor').all(gymId) as PassRow[]).map(passView);
  }

  /** Admins, once GymGO has an agreement with the gym. */
  addPass(adminId: string, gymId: string, body: Record<string, unknown>): PartnerPass {
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : '';
    const priceMinor = Number(body.priceMinor);
    const feeMinor = Number(body.feeMinor);
    const currency = body.currency;
    if (!label) throw new PerkError(400, 'Name the pass (“Day pass”).');
    if (currency !== 'aud' && currency !== 'usd') throw new PerkError(400, 'Passes are in A$ or US$ for now.');
    if (!Number.isInteger(priceMinor) || priceMinor < 100 || priceMinor > 50_000) throw new PerkError(400, 'The pass price should be between 1 and 500.');
    if (!Number.isInteger(feeMinor) || feeMinor < 0 || feeMinor > priceMinor) throw new PerkError(400, 'The booking fee should be between nothing and the pass price.');
    const id = randomUUID();
    this.db
      .prepare('insert into partner_passes (id, gym_id, label, price_minor, fee_minor, currency, active, created_at, created_by) values (?, ?, ?, ?, ?, ?, 1, ?, ?)')
      .run(id, gymId, label, priceMinor, feeMinor, currency, this.now().toISOString(), adminId);
    return { id, gymId, label, priceMinor, feeMinor, currency };
  }

  removePass(passId: string): void {
    const done = this.db.prepare('update partner_passes set active = 0 where id = ?').run(passId);
    if (!done.changes) throw new PerkError(404, 'No pass with that id.');
  }

  /** A booking for a day, paid at Stripe: the pass and the fee as two lines. */
  async bookPass(
    account: { id: string; email: string; display_name: string },
    passId: string,
    forDate: unknown,
    gymName: string,
    urls: { success: string; cancel: string; terms?: string; refunds?: string },
  ): Promise<{ url: string }> {
    const row = this.db.prepare('select * from partner_passes where id = ? and active = 1').get(passId) as PassRow | undefined;
    if (!row) throw new PerkError(404, 'That pass isn’t on offer any more.');
    const today = this.now().toISOString().slice(0, 10);
    const latest = new Date(this.now().getTime() + 60 * 86_400_000).toISOString().slice(0, 10);
    if (typeof forDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(forDate) || forDate < today || forDate > latest) {
      throw new PerkError(400, 'Pick a day in the next two months.');
    }
    const pass = passView(row);
    const bookingId = randomUUID();
    const checkout = await this.subscriptions.payOnce(
      account,
      [
        { name: `${pass.label}: ${gymName}, ${forDate}`, amountMinor: pass.priceMinor, currency: pass.currency },
        ...(pass.feeMinor > 0 ? [{ name: 'GymGO booking fee', amountMinor: pass.feeMinor, currency: pass.currency }] : []),
      ],
      { gymgo_kind: 'pass', gymgo_booking_id: bookingId, gymgo_pass_id: pass.id },
      urls,
    );
    this.db
      .prepare(
        `insert into pass_bookings (id, pass_id, user_id, gym_id, for_date, checkout_session_id, status, amount_minor, fee_minor, currency, created_at)
         values (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      )
      .run(bookingId, pass.id, account.id, pass.gymId, forDate, checkout.id, pass.priceMinor, pass.feeMinor, pass.currency, this.now().toISOString());
    return { url: checkout.url };
  }

  /** Your paid bookings, soonest first. */
  bookingsFor(userId: string): Array<{ id: string; gymId: string; label: string; forDate: string; code: string; totalMinor: number; currency: BillingCurrency }> {
    return (
      this.db
        .prepare(
          `select b.id, b.gym_id, p.label, b.for_date, b.code, b.amount_minor, b.fee_minor, b.currency from pass_bookings b join partner_passes p on p.id = b.pass_id
           where b.user_id = ? and b.status = 'paid' order by b.for_date`,
        )
        .all(userId) as Array<{ id: string; gym_id: string; label: string; for_date: string; code: string; amount_minor: number; fee_minor: number; currency: BillingCurrency }>
    ).map((row) => ({
      id: row.id,
      gymId: row.gym_id,
      label: row.label,
      forDate: row.for_date,
      code: row.code,
      totalMinor: passTotal({ priceMinor: row.amount_minor, feeMinor: row.fee_minor, currency: row.currency }),
      currency: row.currency,
    }));
  }

  exportFor(userId: string): Record<string, unknown> {
    const rows = (sql: string) => this.db.prepare(sql).all(userId) as Array<Record<string, unknown>>;
    return {
      giftsBought: this.giftsBoughtBy(userId),
      proGrants: rows(`select source, starts_at as startsAt, ends_at as endsAt, created_at as createdAt from pro_grants where user_id = ? order by created_at`),
      duo: this.db.prepare('select owner_user_id = ? as youPay, added_at as addedAt from duo_members where owner_user_id = ? or member_user_id = ?').all(userId, userId, userId),
      dayPasses: rows(
        `select gym_id as gymId, for_date as forDate, status, amount_minor as amountMinor, fee_minor as feeMinor, currency, created_at as createdAt, paid_at as paidAt from pass_bookings where user_id = ? order by created_at`,
      ),
    };
  }
}
