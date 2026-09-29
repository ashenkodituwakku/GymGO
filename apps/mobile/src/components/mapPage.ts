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

export const MAPLIBRE_VERSION = '5.24.0';
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** OpenFreeMap's dark style, for dark mode. */
export const DARK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

export type PageMessage =
  | { type: 'ready' }
  | { type: 'select'; id: string }
  | { type: 'mapPress' }
  | {
      type: 'moved';
      /** The area clear of the sheet, for "search this area". */
      box: { north: number; south: number; east: number; west: number };
      /** All of the map on screen, and its zoom in Apple's (256-point) levels, for grouping pins. */
      view: { north: number; south: number; east: number; west: number };
      zoom: number;
    }
  | { type: 'error'; message: string };

export function mapPageHtml(options: { centre: LatLng; colours: Record<string, string>; dark?: boolean }): string {
  const cdn = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist`;
  const config = JSON.stringify({ centre: options.centre, colours: options.colours, style: options.dark ? DARK_STYLE_URL : STYLE_URL });
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${cdn}/maplibre-gl.css">
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${options.dark ? '#000000' : '#F2F2F7'}; }
  body { -webkit-tap-highlight-color: transparent; font-family: sans-serif; }
  #offline { display: none; position: absolute; inset: 0; align-items: center; justify-content: center;
    padding: 24px; text-align: center; color: ${options.dark ? '#AEAEB2' : '#6C6C70'}; font-size: 15px; }
  .maplibregl-ctrl-attrib { font-size: 10px; line-height: 14px; }
  .maplibregl-ctrl-bottom-left .maplibregl-ctrl { margin: 0 0 0 16px; }
</style>
</head>
<body>
<div id="map"></div>
<div id="offline">The map needs an internet connection. The gym list below still works.</div>
<script>
  var CONFIG = ${config};
  var post = function (message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  };
  window.onerror = function (message) { post({ type: 'error', message: String(message) }); };
</script>
<script src="${cdn}/maplibre-gl.js" onerror="document.getElementById('offline').style.display='flex';post({type:'error',message:'map library failed to load'})"></script>
<script>
(function () {
  if (!window.maplibregl) return;
  var DUMBBELL = '<svg viewBox="0 0 24 24" width="60%" height="60%" fill="white" aria-hidden="true">' +
    '<rect x="1.5" y="8" width="3" height="8" rx="1"/><rect x="4.5" y="6" width="3" height="12" rx="1"/>' +
    '<rect x="7.5" y="10.8" width="9" height="2.4"/>' +
    '<rect x="16.5" y="6" width="3" height="12" rx="1"/><rect x="19.5" y="8" width="3" height="8" rx="1"/></svg>';

  // Where a flyTo is headed while it's under way, and whether padding is set yet.
  var flight = null, padded = false;
  var map = new maplibregl.Map({
    container: 'map',
    style: CONFIG.style,
    center: [CONFIG.centre.lng, CONFIG.centre.lat],
    zoom: 13.2,
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
    post({
      type: 'moved',
      box: { north: nw.lat, south: se.lat, west: nw.lng, east: se.lng },
      view: { north: all.getNorth(), south: all.getSouth(), west: all.getWest(), east: all.getEast() },
      // MapLibre's tiles are 512 pixels, so its zoom numbers are one less than Apple's.
      zoom: map.getZoom() + 1
    });
  });
  map.on('load', function () { map.fire('moveend'); });
  map.on('error', function (event) {
    var message = event && event.error && event.error.message ? event.error.message : 'map error';
    post({ type: 'error', message: message });
  });

  // What's drawn, by id, so only what changed is redrawn.
  var markers = {};
  var SPRING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

  function pin(fill, selected, label) {
    var size = selected ? 44 : 30;
    var wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.setAttribute('aria-label', label);
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;';
    var disc = document.createElement('div');
    disc.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + fill + ';' +
      'border:' + (selected ? 3 : 2) + 'px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);' +
      'display:flex;align-items:center;justify-content:center;transform-origin:50% 100%;';
    disc.innerHTML = DUMBBELL;
    wrap.appendChild(disc);
    if (selected) {
      var pointer = document.createElement('div');
      pointer.style.cssText = 'width:0;height:0;margin-top:-2px;border-left:7px solid transparent;' +
        'border-right:7px solid transparent;border-top:9px solid ' + fill + ';';
      wrap.appendChild(pointer);
    }
    return wrap;
  }

  function bubble(fill, count) {
    var size = count < 10 ? 34 : count < 100 ? 40 : 46;
    var wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.setAttribute('aria-label', count + ' gyms here. Zoom in');
    wrap.style.cssText = 'display:flex;background:none;border:0;padding:0;';
    var disc = document.createElement('div');
    disc.style.cssText = 'min-width:' + size + 'px;height:' + size + 'px;border-radius:' + (size / 2) + 'px;background:' + fill + ';' +
      'border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);box-sizing:border-box;padding:0 6px;' +
      'display:flex;align-items:center;justify-content:center;color:#fff;' +
      'font:600 ' + (count < 100 ? 15 : 13) + 'px/1 sans-serif;';
    disc.textContent = String(count);
    wrap.appendChild(disc);
    return wrap;
  }

  // The phone's Reduce Motion (Android's "Remove animations"): pins just appear and go.
  function calm() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function popIn(element, from) {
    var disc = element.firstElementChild;
    if (disc && disc.animate && !calm()) disc.animate([{ transform: 'scale(' + from + ')', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: SPRING });
  }

  function popOut(marker) {
    var disc = marker.getElement().firstElementChild;
    if (!disc || !disc.animate || calm()) return marker.remove();
    var animation = disc.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.5)', opacity: 0 }], { duration: 160, easing: 'ease-in' });
    animation.onfinish = function () { marker.remove(); };
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
      halo.style.cssText = 'width:36px;height:36px;border-radius:18px;background:rgba(0,122,255,0.18);display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1000;';
      var dot = document.createElement('div');
      dot.style.cssText = 'width:16px;height:16px;border-radius:8px;background:#007AFF;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
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
