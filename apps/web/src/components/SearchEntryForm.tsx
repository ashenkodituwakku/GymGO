'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The home page's entry point.
 *
 * A plain GET form, so it works with JavaScript disabled and the resulting
 * search is a shareable URL. "Near me" is an enhancement on top: it asks for
 * location only when the person presses it, and falls back to typing a suburb
 * when permission is refused or unavailable.
 */
export function SearchEntryForm() {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function useMyLocation() {
    setLocationError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('This browser cannot provide your location. Type a suburb instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const params = new URLSearchParams({
          near: 'me',
          // Rounded to about 100 m. We do not need your exact position to
          // list gyms nearby, and it is never sent to analytics.
          lat: position.coords.latitude.toFixed(3),
          lng: position.coords.longitude.toFixed(3),
          r: '3',
        });
        router.push(`/search?${params.toString()}`);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was declined. Type a suburb or postcode instead — everything works the same way.'
            : 'We could not get your location. Type a suburb or postcode instead.',
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }

  return (
    <form action="/search" method="get" className="stack">
      <div className="field">
        <label className="field__label" htmlFor="home-q">
          Suburb or postcode
        </label>
        <input
          id="home-q"
          name="q"
          type="search"
          placeholder="Surry Hills"
          autoComplete="off"
          enterKeyHint="search"
        />
        <span className="field__hint">
          No account needed, and we do not ask for your location unless you press the button below.
        </span>
      </div>

      <div className="row">
        <button className="button button--primary" type="submit">
          Search gyms
        </button>
        <button className="button" type="button" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Finding you…' : 'Near me'}
        </button>
      </div>

      {locationError && (
        <p className="notice notice--warning small" role="status">
          {locationError}
        </p>
      )}
    </form>
  );
}
