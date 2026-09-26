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
  | { type: 'moved'; box: { north: number; south: number; east: number; west: number } }
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
    post({ type: 'moved', box: { north: nw.lat, south: se.lat, west: nw.lng, east: se.lng } });
  });
  map.on('error', function (event) {
    var message = event && event.error && event.error.message ? event.error.message : 'map error';
    post({ type: 'error', message: message });
  });

  var markers = [];

  function pin(fill, selected, label) {
    var size = selected ? 44 : 30;
    var wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.setAttribute('aria-label', label);
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;';
    var disc = document.createElement('div');
    disc.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + fill + ';' +
      'border:' + (selected ? 3 : 2) + 'px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);' +
      'display:flex;align-items:center;justify-content:center;';
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

  var userMarker = null;
  window.gymgo = {
    setPins: function (pins, selectedId) {
      markers.forEach(function (marker) { marker.remove(); });
      markers = pins.map(function (item) {
        var selected = item.id === selectedId;
        var element = pin(CONFIG.colours[item.tier] || '#8E8E93', selected, item.name);
        element.addEventListener('click', function (event) {
          event.stopPropagation();
          post({ type: 'select', id: item.id });
        });
        element.style.zIndex = selected ? '10' : item.tier === 'confirmed' ? '3' : '1';
        return new maplibregl.Marker({ element: element, anchor: selected ? 'bottom' : 'center' })
          .setLngLat([item.position.lng, item.position.lat])
          .addTo(map);
      });
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
