'use client';

import { useState } from 'react';

/**
 * Directions, phone and website, laid out as Maps lays them out: three equal
 * buttons, the primary one filled.
 *
 * For a demo listing these lead nowhere by design: the address and phone
 * number are invented, so sending someone to a map pin or dialling the number
 * would be worse than useless. The buttons say so instead of quietly failing
 * or opening a plausible-looking wrong destination.
 */

function DirectionsIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.18" />
      <path
        d="M7 13.2V10.6c0-.9.7-1.6 1.6-1.6h4.2m0 0-2-2m2 2-2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M6.3 3.4c.5-.2 1 0 1.3.4l1.3 2.1c.3.5.2 1.1-.2 1.4l-.9.8c.7 1.5 1.9 2.7 3.4 3.4l.8-.9c.4-.4 1-.5 1.4-.2l2.1 1.3c.4.3.6.8.4 1.3l-.5 1.4c-.3.7-1 1.2-1.8 1.1C8.5 15.9 4.1 11.5 3.3 6.4c-.1-.8.4-1.5 1.1-1.8l1.9-1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m12.6 7.4-1.6 3.6-3.6 1.6 1.6-3.6 3.6-1.6Z" fill="currentColor" />
    </svg>
  );
}

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
      <div className="action-grid">
        <a className="button button--primary" href={`geo:0,0?q=${destination}`} rel="nofollow noopener">
          <DirectionsIcon />
          Directions
        </a>
        {phone ? (
          <a className="button" href={`tel:${phone.replace(/\s+/g, '')}`} aria-label={`Call ${phone}`}>
            <PhoneIcon />
            Call
          </a>
        ) : (
          <span className="button" aria-disabled="true">
            <PhoneIcon />
            No phone
          </span>
        )}
        {website ? (
          <a className="button" href={website} rel="nofollow noopener" target="_blank">
            <WebsiteIcon />
            Official site
          </a>
        ) : (
          <span className="button" aria-disabled="true">
            <WebsiteIcon />
            No website
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="stack stack--tight">
      <div className="action-grid">
        <button
          className="button button--primary"
          type="button"
          onClick={() =>
            setNote(`Demo listing. There is no real destination for “${address}”, so no map has been opened.`)
          }
        >
          <DirectionsIcon />
          Directions
        </button>
        <button
          className="button"
          type="button"
          onClick={() =>
            setNote(`Demo listing. ${phone ?? 'This number'} is not a real phone number and has not been dialled.`)
          }
        >
          <PhoneIcon />
          Call
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setNote('Demo listing. This gym has no real website, so nothing has been opened.')}
        >
          <WebsiteIcon />
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
