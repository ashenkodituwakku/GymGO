import type { Metadata } from 'next';
import Link from 'next/link';
import { PILOT_PLACES } from '@/server/geocode';
import { PILOT_FRESHNESS } from '@/server/config';
import { loadGymRecords } from '@/server/gyms';
import { SearchEntryForm } from '@/components/SearchEntryForm';

export const metadata: Metadata = {
  title: 'GymGO — find a gym that fits your workout, budget and visit time',
  description:
    'Search inner Sydney gyms by equipment, total visit cost and whether a visitor can actually get in at the hour you want. Every fact carries its source and check date.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const records = await loadGymRecords();

  return (
    <div className="page page--narrow">
      <h1>Find a gym that fits your workout, budget and visit time.</h1>

      <p className="muted" style={{ fontSize: 17 }}>
        Most gym searches end with three unanswered questions: does it have the equipment I need,
        what will I actually pay, and can a visitor get in when I want to train? GymGO answers
        those three, and shows you where each answer came from and when it was last checked.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <SearchEntryForm />
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>What makes this different</h2>
        <div className="stack">
          <div className="card card--muted">
            <h3>Unknown is a real answer</h3>
            <p className="small muted">
              A blank field is not a “no”, and a missing fee is not A$0. If we have not established
              something, the result says so and stays out of your confirmed matches.
            </p>
          </div>
          <div className="card card--muted">
            <h3>Visitor access is not member access</h3>
            <p className="small muted">
              A gym whose members have a 24-hour door may only admit guests while reception is
              staffed. We keep member hours, staffed hours and visitor hours apart, and ask about
              the prerequisites — booking, induction, identification — before calling you eligible.
            </p>
          </div>
          <div className="card card--muted">
            <h3>The real cost of the visit</h3>
            <p className="small muted">
              Budgets are matched against the total you do not get back: the price, applicable tax
              and any mandatory fee. Refundable deposits are shown separately, alongside the cash
              you need on the day.
            </p>
          </div>
          <div className="card card--muted">
            <h3>Facts have a use-by date</h3>
            <p className="small muted">
              We aim to recheck visitor prices and access every {PILOT_FRESHNESS.visitorPriceAccessDays} days
              and equipment every {PILOT_FRESHNESS.equipmentDays} days. Anything past that is
              labelled and does not count as confirmed. These are pilot targets we are testing,
              not guarantees.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Areas in the pilot</h2>
        <p className="small muted">
          The pilot covers a compact area of inner Sydney with {records.length} listings. Coverage
          expands only when the current area stays dependable.
        </p>
        <ul className="match-list" style={{ marginTop: 8 }}>
          {PILOT_PLACES.map((place) => (
            <li key={place.name}>
              <Link className="button button--small" href={`/search?q=${encodeURIComponent(place.name)}`}>
                {place.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Live crowd information</h2>
        <p className="small muted">
          Not available. We have no authorised source for how busy a gym is right now, so we do not
          show one. We will not estimate it from anything else, and we do not collect background
          location to build it.
        </p>
      </section>
    </div>
  );
}
