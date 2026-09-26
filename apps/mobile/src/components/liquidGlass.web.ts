/**
 * Liquid Glass in the browser, as close as CSS gets.
 *
 * Apple's glass does three things a plain blur doesn't: it bends what's
 * behind it near its edges (refraction), it catches light along its rim
 * (specular highlights), and it lifts and brightens where you touch it. The
 * browser can do all three:
 *  - refraction with an SVG displacement filter used as a `backdrop-filter`
 *    (Chrome and Edge only; Safari and Firefox get the blur without the bend);
 *  - highlights with layered inset shadows and a sheen;
 *  - the lift with a brighter layer and a spring, driven by the tab bar.
 *
 * Views opt in with `glassMark(kind)`, which becomes a data attribute.
 */

const FILTER_ID = 'gymgo-refract';
let installed = false;

/**
 * The displacement map: red shifts sideways, green up and down, 128 means
 * "stay put". Neutral in the middle, bending inwards near the edges, the
 * way thick glass does.
 */
function displacementMap(): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>
<defs>
<linearGradient id='x' x1='0' x2='1' y1='0' y2='0'><stop offset='0' stop-color='rgb(255,0,0)'/><stop offset='0.14' stop-color='rgb(128,0,0)'/><stop offset='0.86' stop-color='rgb(128,0,0)'/><stop offset='1' stop-color='rgb(0,0,0)'/></linearGradient>
<linearGradient id='y' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='rgb(0,255,0)'/><stop offset='0.34' stop-color='rgb(0,128,0)'/><stop offset='0.66' stop-color='rgb(0,128,0)'/><stop offset='1' stop-color='rgb(0,0,0)'/></linearGradient>
</defs>
<rect width='100' height='100' fill='url(#x)'/>
<rect width='100' height='100' fill='url(#y)' style='mix-blend-mode:screen'/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const CSS = `
[data-glass="bar"] {
  background: linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.2) 100%);
  -webkit-backdrop-filter: blur(9px) saturate(190%) brightness(1.05);
  backdrop-filter: blur(9px) saturate(190%) brightness(1.05);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    inset 1px 0 0 rgba(255,255,255,0.5),
    inset -1px 0 0 rgba(255,255,255,0.35),
    inset 0 -1px 0 rgba(255,255,255,0.45),
    inset 0 0 22px rgba(255,255,255,0.3),
    0 14px 34px rgba(0,0,0,0.16),
    0 2px 8px rgba(0,0,0,0.08);
  outline: 0.5px solid rgba(0,0,0,0.05);
}
html[data-glass-refract] [data-glass="bar"] {
  -webkit-backdrop-filter: url(#${FILTER_ID}) blur(5px) saturate(190%) brightness(1.05);
  backdrop-filter: url(#${FILTER_ID}) blur(5px) saturate(190%) brightness(1.05);
}
/* Frosted enough that a pin passing under a button reads as under it. */
[data-glass="control"] {
  background: linear-gradient(180deg, rgba(255,255,255,0.64) 0%, rgba(255,255,255,0.46) 100%);
  -webkit-backdrop-filter: blur(14px) saturate(190%) brightness(1.04);
  backdrop-filter: blur(14px) saturate(190%) brightness(1.04);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    inset 1px 0 0 rgba(255,255,255,0.45),
    inset -1px 0 0 rgba(255,255,255,0.3),
    inset 0 -1px 0 rgba(255,255,255,0.4),
    inset 0 0 16px rgba(255,255,255,0.28),
    0 8px 24px rgba(0,0,0,0.14),
    0 1px 4px rgba(0,0,0,0.08);
  outline: 0.5px solid rgba(0,0,0,0.05);
}
[data-glass="shine"] {
  background:
    radial-gradient(140% 100% at 12% -30%, rgba(255,255,255,0.7), rgba(255,255,255,0) 52%),
    radial-gradient(90% 90% at 96% 130%, rgba(255,255,255,0.4), rgba(255,255,255,0) 58%);
  pointer-events: none;
}
[data-glass="lens"] {
  background: rgba(118,118,128,0.15);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 1px rgba(0,0,0,0.04);
}
[data-glass="lift"] {
  background: radial-gradient(120% 120% at 30% 0%, rgba(255,255,255,0.85), rgba(255,255,255,0.45) 60%);
  -webkit-backdrop-filter: saturate(170%) brightness(1.08);
  backdrop-filter: saturate(170%) brightness(1.08);
  box-shadow: inset 0 1px 1px #fff, inset 0 0 14px rgba(255,255,255,0.7), 0 8px 22px rgba(0,0,0,0.16);
}

/* Dark mode (html[data-gg-scheme="dark"], set by app/_layout.tsx): smoked glass, fainter rims. */
html[data-gg-scheme="dark"] [data-glass="bar"] {
  background: linear-gradient(180deg, rgba(58,58,62,0.52) 0%, rgba(36,36,40,0.44) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.2),
    inset 1px 0 0 rgba(255,255,255,0.08),
    inset -1px 0 0 rgba(255,255,255,0.06),
    inset 0 -1px 0 rgba(255,255,255,0.06),
    inset 0 0 22px rgba(255,255,255,0.04),
    0 14px 34px rgba(0,0,0,0.5),
    0 2px 8px rgba(0,0,0,0.3);
  outline: 0.5px solid rgba(255,255,255,0.08);
}
html[data-gg-scheme="dark"] [data-glass="control"] {
  background: linear-gradient(180deg, rgba(62,62,66,0.72) 0%, rgba(40,40,44,0.62) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.2),
    inset 1px 0 0 rgba(255,255,255,0.08),
    inset -1px 0 0 rgba(255,255,255,0.06),
    inset 0 -1px 0 rgba(255,255,255,0.05),
    0 8px 24px rgba(0,0,0,0.45),
    0 1px 4px rgba(0,0,0,0.3);
  outline: 0.5px solid rgba(255,255,255,0.08);
}
html[data-gg-scheme="dark"] [data-glass="shine"] {
  background:
    radial-gradient(140% 100% at 12% -30%, rgba(255,255,255,0.14), rgba(255,255,255,0) 52%),
    radial-gradient(90% 90% at 96% 130%, rgba(255,255,255,0.06), rgba(255,255,255,0) 58%);
}
html[data-gg-scheme="dark"] [data-glass="lens"] {
  background: rgba(118,118,128,0.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.2);
}
/* The map's credit: small and quiet, lined up with the sheets' 16 px edge. */
.maplibregl-ctrl-bottom-left .maplibregl-ctrl { margin: 0 0 0 16px; }
.maplibregl-ctrl-attrib {
  font-size: 10px;
  line-height: 14px;
  color: rgba(60, 60, 67, 0.75);
  background: rgba(255, 255, 255, 0.72) !important;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.maplibregl-ctrl-attrib a { color: rgba(60, 60, 67, 0.9); }
.maplibregl-ctrl-attrib.maplibregl-compact { min-height: 20px; }
html[data-gg-scheme="dark"] .maplibregl-ctrl-attrib {
  background: rgba(28,28,30,0.82) !important;
  color: #AEAEB2;
}
html[data-gg-scheme="dark"] .maplibregl-ctrl-attrib a { color: #E5E5EA; }
html[data-gg-scheme="dark"] .maplibregl-ctrl-attrib-button { filter: invert(1); }
html[data-gg-scheme="dark"] [data-glass="lift"] {
  background: radial-gradient(120% 120% at 30% 0%, rgba(120,120,128,0.7), rgba(80,80,86,0.5) 60%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), inset 0 0 14px rgba(255,255,255,0.08), 0 8px 22px rgba(0,0,0,0.5);
}
`;

/** Refraction needs Chromium's support for SVG filters in backdrop-filter. */
function canRefract(): boolean {
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  return /(Chrome|Chromium)\//.test(agent) && !/Mobile Safari\/.*Version\//.test(agent);
}

export function installLiquidGlass(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.setAttribute('data-gymgo', 'liquid-glass');
  style.textContent = CSS;
  document.head.appendChild(style);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="${FILTER_ID}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="400" height="64" color-interpolation-filters="sRGB">
    <feImage href="${displacementMap()}" x="0" y="0" width="400" height="64" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="42" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
  document.body.appendChild(svg);
  if (canRefract()) document.documentElement.setAttribute('data-glass-refract', '');

  // Each tab is a link, and pressing a mouse on a link and moving starts the
  // browser's own drag-the-link, which cancels the lens drag. Touch doesn't.
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof Element && event.target.closest('[role="tablist"]')) event.preventDefault();
  });
}

/** Fit the refraction to the bar's size, so the bend lands on its edges. */
export function sizeRefraction(width: number, height: number): void {
  if (typeof document === 'undefined') return;
  const filter = document.getElementById(FILTER_ID);
  if (!filter) return;
  for (const node of [filter, filter.querySelector('feImage')]) {
    node?.setAttribute('width', String(Math.round(width)));
    node?.setAttribute('height', String(Math.round(height)));
  }
}

export function glassMark(kind: 'bar' | 'shine' | 'lens' | 'lift'): object {
  return { dataSet: { glass: kind } };
}

/**
 * The same bend for any glass control, sized to it: one filter and one CSS
 * rule per size, made the first time a control of that size appears.
 */
const sized = new Set<string>();
export function refractionFor(width: number, height: number): object {
  if (typeof document === 'undefined' || width < 8 || height < 8) return {};
  const w = Math.round(width);
  const h = Math.round(height);
  const key = `${w}x${h}`;
  if (!sized.has(key)) {
    sized.add(key);
    const id = `${FILTER_ID}-${key}`;
    // Thick glass bends more: about two-thirds of the short side, as the tab bar does.
    const scale = Math.round(Math.min(w, h) * 0.66);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB">
    <feImage href="${displacementMap()}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
    document.body.appendChild(svg);
    const style = document.createElement('style');
    style.textContent = `html[data-glass-refract] [data-refract="${key}"] {
  -webkit-backdrop-filter: url(#${id}) blur(9px) saturate(190%) brightness(1.04);
  backdrop-filter: url(#${id}) blur(9px) saturate(190%) brightness(1.04);
}`;
    document.head.appendChild(style);
  }
  return { dataSet: { glass: 'control', refract: key } };
}
