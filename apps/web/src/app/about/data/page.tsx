import type { Metadata } from 'next';
import Link from 'next/link';
import { PILOT_AREA, PILOT_FRESHNESS, config } from '@/server/config';
import { loadGymRecords } from '@/server/gyms';

export const metadata: Metadata = {
  title: 'How our gym data works',
  description:
    'Where GymGO’s gym information comes from, how we label it, how often we recheck it, and what we refuse to claim.',
  alternates: { canonical: '/about/data' },
};

export default async function DataPage() {
  const records = await loadGymRecords();

  return (
    <div className="page page--narrow">
      <h1>How our data works</h1>
      <p className="muted">
        This page is the contract. If the product ever shows you something that contradicts what is
        written here, the product is wrong.
      </p>

      <section>
        <h2>Where the information comes from</h2>
        <p>
          We keep our own records of each branch, built from what operators tell us, what
          contributors report, and what we check ourselves. We do not build the directory out of a
          mapping provider&rsquo;s business listings: their terms restrict reuse for directory
          purposes, and a dataset we cannot keep is not a dataset we can promise to maintain.
        </p>
        <p>
          Our internal identifier for a gym is our own and is never a provider&rsquo;s identifier.
          That means a provider can be added or dropped without the records becoming orphaned.
        </p>
      </section>

      <section>
        <h2>What the labels mean</h2>
        <ul>
          <li>
            <strong>Confirmed by the gym</strong> — the operator, or their published material, told
            us this.
          </li>
          <li>
            <strong>Checked by us</strong> — one of our team observed it directly.
          </li>
          <li>
            <strong>Reported by a user</strong> — a contributor told us, and a moderator accepted
            it.
          </li>
          <li>
            <strong>Sources disagree</strong> — we hold two answers and have not resolved them. We
            show both rather than picking one, because picking wrong sends you to a gym you cannot
            enter.
          </li>
          <li>
            <strong>Not established</strong> — nobody has answered this either way. It is not a
            &ldquo;no&rdquo;, and a missing price is not free.
          </li>
        </ul>
      </section>

      <section>
        <h2>How old a fact is allowed to be</h2>
        <p>
          For the pilot we aim to recheck visitor prices and access every{' '}
          <strong>{PILOT_FRESHNESS.visitorPriceAccessDays} days</strong>, equipment every{' '}
          <strong>{PILOT_FRESHNESS.equipmentDays} days</strong> and facilities every{' '}
          <strong>{PILOT_FRESHNESS.amenityDays} days</strong>. Anything older is labelled as due for
          a recheck and stops counting as a confirmed match.
        </p>
        <p>
          These are operating targets we are testing, not guarantees, and not a claim that a fact
          expires on a particular day. Only real evidence moves a check date forward: a scheduled
          job that finds nothing new does not make old information look new.
        </p>
      </section>

      <section>
        <h2>What a budget means</h2>
        <p>
          A budget is matched against the total you do not get back: the price, applicable tax, and
          any mandatory fee. A refundable deposit is shown separately and never counted against a
          budget, but it is included in the cash you need on the day. A A$25 visit with a A$20
          refundable deposit fits a A$30 budget and still needs A$45 in hand.
        </p>
        <p>
          If any mandatory charge is unknown, the total is <strong>not confirmed</strong> and cannot
          satisfy a budget filter. We would rather show you an open question than a confident wrong
          number.
        </p>
      </section>

      <section>
        <h2>Access, and why we split it three ways</h2>
        <p>
          Member access, staffed reception and visitor entry are three different schedules. A gym
          whose members have a 24-hour door may admit guests only between 9am and 4pm. We record
          them separately, and an unknown visitor schedule stays unknown no matter how generous the
          member hours are.
        </p>
        <p>
          We also record the prerequisites: advance booking, a first-visit induction, photo
          identification, minimum age, residency conditions, and whether a member has to sign you
          in. If any of those is unresolved, you will see <strong>Needs confirmation</strong> even
          inside guest hours.
        </p>
      </section>

      <section>
        <h2>What we do not claim</h2>
        <ul>
          <li>
            We never guarantee admission. We tell you what we know about the rules and how recently
            we checked.
          </li>
          <li>
            We never say a machine is free right now. Inventory, working condition and real-time
            availability are three different questions.
          </li>
          <li>
            <strong>Live crowd information is unavailable.</strong> We have no authorised source, so
            we show none. We will not estimate it, and we do not collect background location to
            build it.
          </li>
          <li>
            We do not average our reviews together with ratings from anywhere else, and no review
            carries a verified badge: we have no mechanism to verify a visit, and saying you went is
            not evidence that you did.
          </li>
          <li>There is no paid verification and no paid placement. Nothing here can be bought.</li>
        </ul>
      </section>

      <section>
        <h2>Photographs</h2>
        <p>
          We show photographs only where we have permission to publish them. Where we have none, the
          slot says &ldquo;No photo supplied&rdquo;. We do not generate a picture of a gym: an
          invented image presented as a venue would be a lie about a place you are deciding whether
          to visit.
        </p>
      </section>

      <section>
        <h2>Coverage</h2>
        <p>
          The pilot covers {PILOT_AREA.label} with {records.length} listings
          {config.dataSource === 'demo' ? ', all of them invented demo records' : ''}. We would
          rather cover one area dependably than many thinly, so coverage expands only when the
          current area holds up.
        </p>
        <p>
          Found something wrong? Every gym page has <strong>Suggest a correction</strong>. It is
          free, it always will be, and a correction is never blocked or prioritised by whether the
          gym pays us anything.
        </p>
      </section>

      <p style={{ marginTop: 32 }}>
        <Link href="/search">Back to search</Link>
      </p>
    </div>
  );
}
