'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readSaved, type SavedEntry } from './SaveButton';

/**
 * The saved list.
 *
 * Reads from this browser only, which is why it renders on the client and why
 * it tells you plainly where the list lives.
 */
export function SavedList() {
  const [entries, setEntries] = useState<SavedEntry[] | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(readSaved());
    refresh();
    window.addEventListener('gymgo:saved-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('gymgo:saved-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (entries === null) return <p className="muted">Reading your saved gyms…</p>;

  if (entries.length === 0) {
    return (
      <div className="notice">
        <p>
          Nothing saved yet. Use <strong>Save</strong> on a search result or gym page. Saved gyms
          stay in this browser — no account, and nothing is sent to us.
        </p>
        <p style={{ marginBottom: 0 }}>
          <Link href="/search">Start searching</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="result-list">
        {entries.map((entry) => (
          <li key={entry.gymId}>
            <div className="card">
              <div className="row row--between">
                <h2 className="gym-card__title" style={{ fontSize: 17 }}>
                  <Link href={`/gym/${entry.slug}`}>{entry.name}</Link>
                </h2>
                <span className="meta-line">Saved {entry.savedAt.slice(0, 10)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 16 }}>
        <Link
          className="button button--small"
          href={`/compare?ids=${entries.slice(0, 3).map((entry) => entry.gymId).join(',')}`}
        >
          Compare the first three
        </Link>
      </p>
    </>
  );
}
