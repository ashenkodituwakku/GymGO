/**
 * The page the Android map runs in (see GymMap.android.tsx).
 *
 * It draws the same map the PC version draws: MapLibre GL with OpenFreeMap's
 * free tiles (OpenStreetMap data, attribution kept visible), and the same
 * tier-coloured pins. The app talks to it through `window.gymgo.*`, and it
 * reports taps back with `ReactNativeWebView.postMessage`.
 *
 * Pure string-building with no React Native imports, so it can be tested
 * in a plain browser.
 */

import type { LatLng } from '@gymgo/domain';
import { DROP_BOX, DROP_DRAWN, DROP_GLYPH_BOX, DROP_HEAD, DROP_HIGHLIGHT, DROP_OUTLINE, DROP_PATH } from '../lib/pinShape';

export const MAPLIBRE_VERSION = '5.24.0';
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** OpenFreeMap's dark style, for dark mode. */
export const DARK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

export type PageMessage =
  | { type: 'ready' }
  /** The map's own pictures didn't come (offline, or a network that blocks them). */
  | { type: 'failed' }
  /** The first of them arrived: the map is showing. */
  | { type: 'loaded' }
  | { type: 'select'; id: string }
  | { type: 'mapPress' }
  | {
      type: 'moved';
      /** The area clear of the sheet, for "search this area". */
      box: { north: number; south: number; east: number; west: number };
      /** All of the map on screen, and its zoom in Apple's (256-point) levels, for grouping pins. */
      view: { north: number; south: number; east: number; west: number };
      zoom: number;
      /** Where the camera is, so a page started over opens where this one was. */
      centre: { lat: number; lng: number };
    }
  | { type: 'error'; message: string };

/** How far in a new page opens, in MapLibre's levels (one less than Apple's). */
export const OPENING_ZOOM = 13.2;

export function mapPageHtml(options: {
  centre: LatLng;
  /** MapLibre's level; a page started over passes the last page's. */
  zoom?: number;
  colours: Record<string, string>;
  dark?: boolean;
}): string {
  const cdn = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist`;
  const config = JSON.stringify({
    centre: options.centre,
    zoom: options.zoom ?? OPENING_ZOOM,
    colours: options.colours,
    style: options.dark ? DARK_STYLE_URL : STYLE_URL,
  });
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${cdn}/maplibre-gl.css">
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${options.dark ? '#000000' : '#F2F2F7'}; }
  /* A long press picks nothing: no text selection, no copy menu over the credit. */
  body { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; font-family: sans-serif; }
  .maplibregl-ctrl-attrib { font-size: 10px; line-height: 14px; }
  .maplibregl-ctrl-bottom-left .maplibregl-ctrl { margin: 0 0 0 16px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var CONFIG = ${config};
  var post = function (message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  };
  window.onerror = function (message) { post({ type: 'error', message: String(message) }); };
</script>
<script src="${cdn}/maplibre-gl.js" onerror="post({type:'failed'});post({type:'error',message:'map library failed to load'})"></script>
<script>
(function () {
  if (!window.maplibregl) return;
  // The same pins as the browser's (GymMap.web.tsx): lit from above, ringed in white, a teardrop when picked.
  var DUMBBELL = function (size) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="#fff" aria-hidden="true">' +
      '<rect x="2" y="8.6" width="2.6" height="6.8" rx="1.2"/><rect x="5" y="6.2" width="3.3" height="11.6" rx="1.5"/>' +
      '<rect x="8" y="10.9" width="8" height="2.2" rx="1.1"/>' +
      '<rect x="15.7" y="6.2" width="3.3" height="11.6" rx="1.5"/><rect x="19.4" y="8.6" width="2.6" height="6.8" rx="1.2"/></svg>';
  };
  var DROP = '${DROP_PATH}';
  function channels(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }
  // Toward white (255) or black (0) by an amount.
  function shade(hex, to, amount) {
    var c = channels(hex);
    if (!c) return hex;
    return 'rgb(' + c.map(function (v) { return Math.round(v + (to - v) * amount); }).join(',') + ')';
  }
  function tint(hex, alpha) {
    var c = channels(hex);
    return c ? 'rgba(' + c.join(',') + ',' + alpha + ')' : hex;
  }
  function lit(fill) {
    return 'linear-gradient(180deg, ' + shade(fill, 255, 0.28) + ' 0%, ' + fill + ' 62%, ' + shade(fill, 0, 0.08) + ' 100%)';
  }
  var dropIds = 0;

  // Where a flyTo is headed while it's under way, and whether padding is set yet.
  var flight = null, padded = false;
  var map = new maplibregl.Map({
    container: 'map',
    style: CONFIG.style,
    center: [CONFIG.centre.lng, CONFIG.centre.lat],
    zoom: CONFIG.zoom,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false
  });
  map.touchZoomRotate.disableRotation();
  // The tile licence requires this credit to stay visible.
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  map.on('click', function () { post({ type: 'mapPress' }); });
  // The area on screen, clear of the sheet, whenever the map comes to rest.
  map.on('moveend', function () {
    flight = null;
    var pad = map.getPadding();
    var canvas = map.getCanvas();
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var nw = map.unproject([pad.left || 0, pad.top || 0]);
    var se = map.unproject([w - (pad.right || 0), Math.max((pad.top || 0) + 1, h - (pad.bottom || 0))]);
    var all = map.getBounds();
    var centre = map.getCenter();
    post({
      type: 'moved',
      box: { north: nw.lat, south: se.lat, west: nw.lng, east: se.lng },
      view: { north: all.getNorth(), south: all.getSouth(), west: all.getWest(), east: all.getEast() },
      // MapLibre's tiles are 512 pixels, so its zoom numbers are one less than Apple's.
      zoom: map.getZoom() + 1,
      centre: { lat: centre.lat, lng: centre.lng }
    });
  });
  map.on('load', function () { map.fire('moveend'); });
  // The style never coming, or the first few tiles all failing, is a failed
  // map (as in the browser's, GymMap.web.tsx); the first tile to arrive says
  // it's showing, once.
  var styled = false, tileLoaded = false, tileErrors = 0;
  map.on('style.load', function () { styled = true; });
  map.on('data', function (event) {
    if (!tileLoaded && event.dataType === 'source' && event.tile) {
      tileLoaded = true;
      post({ type: 'loaded' });
    }
  });
  map.on('error', function (event) {
    var message = event && event.error && event.error.message ? event.error.message : 'map error';
    post({ type: 'error', message: message });
    if (!styled) post({ type: 'failed' });
    else if (event && event.tile && !tileLoaded && ++tileErrors >= 3) post({ type: 'failed' });
  });
  // The style names a few place icons (rowing, ATM, ferry...) its icon set
  // doesn't have; each gets an empty one rather than a warning every load.
  map.on('styleimagemissing', function (event) {
    if (!map.hasImage(event.id)) map.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) });
  });

  // What's drawn, by id, so only what changed is redrawn.
  var markers = {};
  var SPRING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

  function pin(fill, selected, label) {
    var wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.setAttribute('aria-label', label);
    // No position of its own: MapLibre's marker class keeps it absolute (relative stacked the pins, off their gyms).
    // A dot takes taps across a full 44 points round its 28 (even padding keeps it centred on its gym); the
    // picked teardrop stands on its tip, so it gets none.
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:' + (selected ? 0 : 8) + 'px;';
    var face = document.createElement('div');
    face.className = 'gg-face';
    if (selected) {
      // One smooth teardrop, with its shadow on the ground under the tip.
      var id = 'gg' + (dropIds += 1);
      face.style.cssText = 'position:relative;width:${DROP_DRAWN.width}px;height:${DROP_DRAWN.height}px;transform-origin:50% 100%;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.28)) drop-shadow(0 1px 1.5px rgba(0,0,0,0.25));';
      face.innerHTML = '<svg viewBox="0 0 ${DROP_BOX.width} ${DROP_BOX.height}" width="${DROP_DRAWN.width}" height="${DROP_DRAWN.height}" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + shade(fill, 255, 0.3) + '"/><stop offset="0.55" stop-color="' + fill + '"/><stop offset="1" stop-color="' + shade(fill, 0, 0.1) + '"/>' +
        '</linearGradient></defs><path d="' + DROP + '" fill="url(#' + id + ')" stroke="#fff" stroke-width="${DROP_OUTLINE}"/>' +
        '<circle cx="${DROP_HEAD.cx}" cy="${DROP_HEAD.cy}" r="${DROP_HIGHLIGHT}" fill="rgba(255,255,255,0.14)"/></svg>' +
        '<div style="position:absolute;left:0;right:0;top:0;height:${DROP_GLYPH_BOX}px;display:flex;align-items:center;justify-content:center;">' + DUMBBELL(21) + '</div>';
      var ground = document.createElement('div');
      ground.style.cssText = 'position:absolute;bottom:-3px;left:50%;width:16px;height:6px;margin-left:-8px;border-radius:50%;background:radial-gradient(closest-side, rgba(0,0,0,0.32), rgba(0,0,0,0));pointer-events:none;';
      wrap.appendChild(ground);
      wrap.appendChild(face);
      return wrap;
    }
    face.style.cssText = 'width:28px;height:28px;border-radius:50%;background:' + lit(fill) + ';border:2px solid #fff;box-sizing:border-box;' +
      'box-shadow:0 1px 2px rgba(0,0,0,0.28),0 4px 10px rgba(0,0,0,0.18);' +
      'display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;';
    face.innerHTML = DUMBBELL(16);
    wrap.appendChild(face);
    return wrap;
  }

  function bubble(fill, count) {
    var size = count < 10 ? 32 : count < 100 ? 38 : 44;
    var wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.setAttribute('aria-label', count + ' gyms here. Zoom in');
    // At least 44 points to tap, like a pin.
    wrap.style.cssText = 'display:flex;background:none;border:0;padding:' + Math.max(0, (44 - size) / 2) + 'px;';
    var face = document.createElement('div');
    face.className = 'gg-face';
    face.style.cssText = 'min-width:' + size + 'px;height:' + size + 'px;border-radius:' + (size / 2) + 'px;background:' + lit(fill) + ';' +
      'border:2px solid #fff;box-shadow:0 0 0 4px ' + tint(fill, 0.22) + ',0 1px 2px rgba(0,0,0,0.28),0 5px 12px rgba(0,0,0,0.2);box-sizing:border-box;padding:0 7px;' +
      'display:flex;align-items:center;justify-content:center;color:#fff;font-variant-numeric:tabular-nums;' +
      'font:600 ' + (count < 100 ? 14 : 12.5) + 'px/1 Roboto,system-ui,sans-serif;letter-spacing:-0.2px;text-shadow:0 1px 1px rgba(0,0,0,0.15);';
    face.textContent = String(count);
    wrap.appendChild(face);
    return wrap;
  }

  // The phone's Reduce Motion (Android's "Remove animations"): pins just appear and go.
  function calm() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function popIn(element, from) {
    var disc = element.querySelector('.gg-face');
    if (disc && disc.animate && !calm()) disc.animate([{ transform: 'scale(' + from + ')', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: SPRING });
  }

  function popOut(marker) {
    var disc = marker.getElement().querySelector('.gg-face');
    if (!disc || !disc.animate || calm()) return marker.remove();
    var animation = disc.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.5)', opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    // Gone for certain even if the animation never finishes (a paused page),
    // so a gym can't be left on the map twice.
    var gone = false;
    function remove() { if (!gone) { gone = true; marker.remove(); } }
    animation.onfinish = remove;
    animation.oncancel = remove;
    setTimeout(remove, 400);
  }

  function sameSpot(points) {
    var lats = points.map(function (p) { return p.lat; }), lngs = points.map(function (p) { return p.lng; });
    return Math.max.apply(null, lats) - Math.min.apply(null, lats) < 0.0004 && Math.max.apply(null, lngs) - Math.min.apply(null, lngs) < 0.0004;
  }

  var userMarker = null;
  window.gymgo = {
    // Pins and bubbles (see lib/cluster.ts); only what changed is redrawn.
    setItems: function (items) {
      var next = {};
      items.forEach(function (item) {
        var isPin = item.kind === 'pin';
        var tier = isPin ? item.pin.tier : item.tier;
        var fill = CONFIG.colours[tier] || '#8E8E93';
        var position = isPin ? item.pin.position : item.position;
        var sig = isPin ? 'pin:' + tier + ':' + item.selected : 'cluster:' + item.count + ':' + tier;
        var kept = markers[item.id];
        if (kept && kept.sig === sig) {
          kept.marker.setLngLat([position.lng, position.lat]);
          next[item.id] = kept;
          delete markers[item.id];
          return;
        }
        var wasSelected = kept ? /:true$/.test(kept.sig) : false;
        if (kept) kept.marker.remove();
        delete markers[item.id];
        var element;
        if (isPin) {
          element = pin(fill, item.selected, item.pin.name);
          element.addEventListener('click', function (event) {
            event.stopPropagation();
            post({ type: 'select', id: item.pin.id });
          });
          element.style.zIndex = item.selected ? '10' : tier === 'confirmed' ? '3' : '1';
        } else {
          element = bubble(fill, item.count);
          element.style.zIndex = '4';
          element.addEventListener('click', function (event) {
            event.stopPropagation();
            if (sameSpot(item.points)) return post({ type: 'select', id: item.ids[0] });
            var bounds = new maplibregl.LngLatBounds([item.points[0].lng, item.points[0].lat], [item.points[0].lng, item.points[0].lat]);
            item.points.forEach(function (p) { bounds.extend([p.lng, p.lat]); });
            map.fitBounds(bounds, { padding: 80, duration: 450, maxZoom: 16 });
          });
        }
        var marker = new maplibregl.Marker({ element: element, anchor: isPin && item.selected ? 'bottom' : 'center' })
          .setLngLat([position.lng, position.lat])
          .addTo(map);
        popIn(element, isPin && item.selected ? 0.68 : wasSelected ? 1.3 : 0.4);
        next[item.id] = { marker: marker, sig: sig };
      });
      Object.keys(markers).forEach(function (id) { popOut(markers[id].marker); });
      markers = next;
    },
    flyTo: function (lat, lng, zoom) {
      flight = { center: [lng, lat], zoom: zoom };
      map.flyTo({ center: flight.center, zoom: zoom, duration: 450 });
    },
    fitTo: function (points) {
      if (!points.length) return;
      var bounds = new maplibregl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]);
      points.forEach(function (point) { bounds.extend([point.lng, point.lat]); });
      map.fitBounds(bounds, { padding: 60, duration: 500, maxZoom: 15 });
    },
    setUser: function (lat, lng) {
      if (userMarker) userMarker.remove();
      userMarker = null;
      if (lat === null) return;
      var halo = document.createElement('div');
      halo.style.cssText = 'width:36px;height:36px;border-radius:50%;background:rgba(0,122,255,0.18);display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1000;';
      var dot = document.createElement('div');
      dot.style.cssText = 'width:16px;height:16px;box-sizing:content-box;border-radius:50%;background:#007AFF;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
      halo.appendChild(dot);
      userMarker = new maplibregl.Marker({ element: halo, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
    },
    setPadding: function (top, bottom, credit) {
      // Eased with the sheet; mid-flight, the flight is re-aimed instead of stopped.
      var padding = { top: top, bottom: bottom, left: 0, right: 0 };
      var target = flight;
      if (!padded) map.setPadding(padding);
      else if (target && map.isMoving()) {
        map.flyTo({ center: target.center, zoom: target.zoom, padding: padding, duration: 450 });
        flight = target;
      } else map.easeTo({ padding: padding, duration: 300 });
      padded = true;
      var corner = document.querySelector('.maplibregl-ctrl-bottom-left');
      if (corner) corner.style.bottom = ((credit || bottom) + 6) + 'px';
    }
  };

  post({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
