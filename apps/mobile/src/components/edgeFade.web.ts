/**
 * A sideways row (filter chips, a rail of cards) fades out at its ends in
 * a browser, so a chip cut off at the edge reads as "more this way" rather
 * than as cut off. Only the row's own padding fades at the start, so the
 * first chip shows whole until you scroll.
 *
 * A CSS mask, set once for every row marked with `edgeFade()`.
 */

let installed = false;

function install(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const mask = 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 32px), transparent 100%)';
  const style = document.createElement('style');
  style.textContent = `[data-edge-fade] { -webkit-mask-image: ${mask}; mask-image: ${mask}; }`;
  document.head.appendChild(style);
}

/** Spread onto a horizontal ScrollView. */
export function edgeFade(): object {
  install();
  return { dataSet: { edgeFade: 'on' } };
}
