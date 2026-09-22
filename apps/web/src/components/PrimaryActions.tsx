'use client';

import { useState } from 'react';

/**
 * Directions, phone and website.
 *
 * For a demo listing these lead nowhere by design: the address and phone
 * number are invented, so sending someone to a map pin or dialling the number
 * would be worse than useless. The buttons say so instead of quietly failing
 * or opening a plausible-looking wrong destination.
 */
export function PrimaryActions({
  isDemo,
  name,
  address,
  phone,
  website,
}: {
  isDemo: boolean;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
}) {
  const [note, setNote] = useState<string | null>(null);

  if (!isDemo) {
    const destination = encodeURIComponent(`${name}, ${address}`);
    return (
      <div className="row">
        <a
          className="button button--primary"
          href={`geo:0,0?q=${destination}`}
          rel="nofollow noopener"
        >
          Directions
        </a>
        {phone && (
          <a className="button" href={`tel:${phone.replace(/\s+/g, '')}`}>
            Call {phone}
          </a>
        )}
        {website && (
          <a className="button" href={website} rel="nofollow noopener" target="_blank">
            Official site
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="stack stack--tight">
      <div className="row">
        <button
          className="button button--primary"
          type="button"
          onClick={() => setNote(`Demo listing. There is no real destination for “${address}”, so no map has been opened.`)}
        >
          Directions
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setNote(`Demo listing. ${phone ?? 'This number'} is not a real phone number and has not been dialled.`)}
        >
          Call
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setNote('Demo listing. This gym has no real website, so nothing has been opened.')}
        >
          Official site
        </button>
      </div>
      {note && (
        <p className="notice small" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
