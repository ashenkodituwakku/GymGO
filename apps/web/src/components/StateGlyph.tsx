/**
 * A small filled-circle state mark, in the manner of SF Symbols'
 * checkmark.circle.fill / xmark.circle.fill / exclamationmark.circle.fill.
 *
 * Drawn inline rather than from an icon font so it renders crisply at 16 px on
 * every platform and takes its colour from the surrounding text. It is always
 * decorative: the state it shows is also said in words next to it.
 */

export type GlyphState = 'confirmed' | 'unresolved' | 'ruled-out';

export function StateGlyph({ state }: { state: GlyphState }) {
  return (
    <svg
      className={`spec-glyph spec-glyph--${state}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      {state === 'confirmed' && (
        <path
          d="M4.6 8.3 6.9 10.6 11.4 5.7"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {state === 'ruled-out' && (
        <path
          d="M5.6 5.6 10.4 10.4M10.4 5.6 5.6 10.4"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
      {state === 'unresolved' && (
        <>
          <path d="M8 4.4v4.3" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r="1.1" fill="#fff" />
        </>
      )}
    </svg>
  );
}

/** Map an equipment or amenity match state onto one of the three glyphs. */
export function glyphFor(state: string): GlyphState {
  if (state === 'confirmed') return 'confirmed';
  if (state === 'missing' || state === 'below_requirement') return 'ruled-out';
  return 'unresolved';
}
