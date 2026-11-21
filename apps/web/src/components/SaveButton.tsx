'use client';

import { useEffect, useState } from 'react';

/**
 * Saving a gym.
 *
 * Kept in this browser only. No account, no server call, nothing sent
 * anywhere — which is why it works before you have signed in and why the
 * button says where the list lives.
 */

const STORAGE_KEY = 'gymgo.saved.v1';

export interface SavedEntry {
  gymId: string;
  slug: string;
  name: string;
  savedAt: string;
}

export function readSaved(): SavedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedEntry[]) : [];
  } catch {
    // Private browsing and blocked storage both land here. Saving is a
    // convenience, so it degrades rather than breaking the page.
    return [];
  }
}

function writeSaved(entries: SavedEntry[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event('gymgo:saved-changed'));
    return true;
  } catch {
    return false;
  }
}

export function SaveButton({
  gymId,
  slug,
  name,
  small = false,
}: {
  gymId: string;
  slug: string;
  name: string;
  small?: boolean;
}) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSaved(readSaved().some((entry) => entry.gymId === gymId));
  }, [gymId]);

  function toggle() {
    const current = readSaved();
    const next = saved
      ? current.filter((entry) => entry.gymId !== gymId)
      : [...current, { gymId, slug, name, savedAt: new Date().toISOString() }];
    if (writeSaved(next)) {
      setSaved(!saved);
    } else {
      setFailed(true);
    }
  }

  // Until the browser has been read, the button would be guessing.
  if (saved === null) {
    return (
      <button className={small ? 'button button--small' : 'button'} type="button" disabled>
        Save
      </button>
    );
  }

  if (failed) {
    return (
      <span className="small muted">
        This browser is blocking local storage, so gyms cannot be saved here.
      </span>
    );
  }

  return (
    <button
      className={small ? 'button button--small' : 'button'}
      type="button"
      onClick={toggle}
      aria-pressed={saved}
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
