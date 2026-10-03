'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const MAX_COMPARE = 3;

/** Adds or removes a gym from the comparison, which lives in the URL. */
export function CompareToggle({ gymId, name }: { gymId: string; name: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('cmp') ?? '').split(',').filter(Boolean);
  const selected = current.includes(gymId);
  const full = current.length >= MAX_COMPARE && !selected;

  function toggle() {
    const next = selected ? current.filter((id) => id !== gymId) : [...current, gymId].slice(0, MAX_COMPARE);
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) params.delete('cmp');
    else params.set('cmp', next.join(','));
    router.push(`/search?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      className="button button--small"
      type="button"
      onClick={toggle}
      disabled={full}
      aria-pressed={selected}
      title={full ? `You can compare up to ${MAX_COMPARE} gyms at once.` : undefined}
    >
      {selected ? 'In comparison' : 'Compare'}
      <span className="visually-hidden"> {name}</span>
    </button>
  );
}

/** The sticky tray showing what is currently being compared. */
export function CompareTray({ names }: { names: Array<{ id: string; name: string }> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  if (names.length === 0) return null;

  const ids = names.map((entry) => entry.id).join(',');

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('cmp');
    router.push(`/search?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="compare-tray" role="region" aria-label="Comparison">
      <span>
        Comparing {names.length} of {MAX_COMPARE}: {names.map((entry) => entry.name).join(', ')}
      </span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button className="button button--small" type="button" onClick={clear}>
          Clear
        </button>
        <Link className="button button--small" href={`/compare?ids=${ids}`}>
          Compare side by side
        </Link>
      </span>
    </div>
  );
}
