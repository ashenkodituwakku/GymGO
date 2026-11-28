import Link from 'next/link';
import { PILOT_PLACES } from '@/server/geocode';
import { PILOT_AREA } from '@/server/config';

export default function NotFound() {
  return (
    <div className="page page--narrow">
      <h1>We do not have that page</h1>
      <p className="muted">
        Either the address is wrong, or it is an area or gym the pilot does not cover. Coverage is
        limited to {PILOT_AREA.label} on purpose: one area kept dependable is more use than many
        kept thinly.
      </p>
      <p>
        <Link className="button button--primary" href="/search">
          Search gyms
        </Link>
      </p>
      <h2 style={{ marginTop: 24 }}>Areas we do cover</h2>
      <ul className="match-list">
        {PILOT_PLACES.map((place) => (
          <li key={place.name}>
            <Link className="button button--small" href={`/search?q=${encodeURIComponent(place.name)}`}>
              {place.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
