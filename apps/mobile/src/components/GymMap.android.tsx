/**
 * The map, on Android.
 *
 * Expo Go on Android currently can't show Google Maps: tiles never load and
 * the map stays blank (expo/expo#49323). So on Android the map is drawn in a
 * web view instead, with the same free OpenFreeMap tiles and pins the PC
 * version uses (see mapPage.ts). That works in Expo Go today, and it also
 * means a real Android build later needs no Google Maps key or billing
 * account. iPhone keeps Apple's own map (GymMap.tsx).
 *
 * The blue "you are here" dot is drawn by the page, from where the app found
 * you. If the map's pictures don't come, it says so with a Try again, as the
 * browser's does.
 *
 * Android can take a web view's page away to free memory, typically while
 * the app sits in the background. The map then starts a fresh page where the
 * old one was, and hands it the pins, the dot and the padding again: before,
 * it stayed blank and dead to taps until GymGO was closed.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { BoundingBox, LatLng } from '@gymgo/domain';
import { mapItems } from '@/lib/cluster';
import { MapNotice } from './MapNotice';
import { mapPageHtml, type PageMessage } from './mapPage';
import { TIER_COLOUR } from './ui';
import type { GymMapHandle, GymMapProps } from './map-types';
import { color, currentTheme, themed } from '@/lib/theme';

export type { GymMapHandle, MapPin } from './map-types';

/** What the page is told that it keeps, the latest of each, so a fresh page can be told again. */
type Kept = 'padding' | 'user' | 'items';
/** Padding first: a move waiting for the page is aimed with it. */
const KEPT_ORDER: Kept[] = ['padding', 'user', 'items'];

export const GymMap = forwardRef<GymMapHandle, GymMapProps>(function GymMap(
  { pins, selectedId, initialCentre, bottomInset, creditInset, topInset, userLocation = null, onSelect, onMapPress, onRegionChange },
  ref,
) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const kept = useRef<Partial<Record<Kept, string>>>({});
  /** A camera move asked for before the page was ready: only the latest matters. */
  const move = useRef<string | null>(null);
  const handlers = useRef({ onSelect, onMapPress, onRegionChange });
  handlers.current = { onSelect, onMapPress, onRegionChange };
  /** Where the camera was when the page last came to rest. */
  const camera = useRef<{ centre: LatLng; zoom: number } | null>(null);
  // Counts the pages started; a new one (Android took the last away, or Try again) remounts the web view.
  const [page, setPage] = useState(0);
  const [failed, setFailed] = useState(false);

  // One page per start, opening where the last one was. Later moves are the page's own.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(
    () =>
      mapPageHtml({
        centre: camera.current?.centre ?? initialCentre,
        zoom: camera.current ? camera.current.zoom - 1 : undefined,
        colours: Object.fromEntries(Object.entries(TIER_COLOUR).map(([tier, tone]) => [tier, tone.fill])),
        dark: currentTheme().scheme === 'dark',
      }),
    [page],
  );

  const inject = useCallback((script: string) => web.current?.injectJavaScript(`${script};true;`), []);

  /** Tell the page something it keeps (now, or once it's ready). */
  const keep = useCallback(
    (kind: Kept, script: string) => {
      kept.current[kind] = script;
      if (ready.current) inject(script);
    },
    [inject],
  );

  /** Move the camera (now, or once the page is ready). */
  const moveTo = useCallback(
    (script: string) => {
      if (ready.current) inject(script);
      else move.current = script;
    },
    [inject],
  );

  const startOver = useCallback(() => {
    ready.current = false;
    setFailed(false);
    setPage((n) => n + 1);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(centre, span = 0.03) {
        const zoom = Math.log2(360 / span) - 0.6;
        moveTo(`gymgo.flyTo(${centre.lat},${centre.lng},${zoom})`);
      },
      fitTo(points) {
        moveTo(`gymgo.fitTo(${JSON.stringify(points)})`);
      },
    }),
    [moveTo],
  );

  // The zoom and area on screen, as the page last reported them, for grouping pins.
  const [view, setView] = useState<{ zoom: number; box: BoundingBox } | null>(null);
  const items = useMemo(() => mapItems(pins, view?.zoom ?? 14, view?.box ?? null, selectedId), [pins, view, selectedId]);
  useEffect(() => {
    keep('items', `gymgo.setItems(${JSON.stringify(items)})`);
  }, [items, keep]);

  useEffect(() => {
    keep('user', userLocation ? `gymgo.setUser(${userLocation.lat},${userLocation.lng})` : 'gymgo.setUser(null,null)');
  }, [userLocation, keep]);

  useEffect(() => {
    keep('padding', `gymgo.setPadding(${Math.round(topInset)},${Math.round(bottomInset)},${Math.round(Math.max(bottomInset, creditInset ?? 0))})`);
  }, [topInset, bottomInset, creditInset, keep]);

  const warned = useRef(false);
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let message: PageMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as PageMessage;
    } catch {
      return;
    }
    if (message.type === 'ready') {
      ready.current = true;
      for (const kind of KEPT_ORDER) {
        const script = kept.current[kind];
        if (script) inject(script);
      }
      if (move.current) inject(move.current);
      move.current = null;
    } else if (message.type === 'select') {
      handlers.current.onSelect(message.id);
    } else if (message.type === 'mapPress') {
      handlers.current.onMapPress();
    } else if (message.type === 'moved') {
      camera.current = { centre: message.centre, zoom: message.zoom };
      handlers.current.onRegionChange?.(message.box);
      setView({ zoom: message.zoom, box: message.view });
    } else if (message.type === 'failed') {
      setFailed(true);
    } else if (message.type === 'loaded') {
      setFailed(false);
    } else if (message.type === 'error') {
      // Once, and only while developing: a flaky network fails tile after
      // tile, and each warning would pop up over the app in Expo Go.
      if (__DEV__ && !warned.current) {
        warned.current = true;
        console.warn('[map]', message.message);
      }
    }
  }, [inject]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        key={page}
        ref={web}
        source={{ html }}
        originWhitelist={['*']}
        onMessage={onMessage}
        // A reload starts the page over, so what it keeps is held until it says it's ready again.
        onLoadStart={() => {
          ready.current = false;
        }}
        // Android took the page away (memory): this web view is spent, so a new one takes its place.
        onRenderProcessGone={startOver}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        setBuiltInZoomControls={false}
        androidLayerType="hardware"
        style={styles.web}
      />
      {failed && <MapNotice top={topInset} bottom={bottomInset} onRetry={startOver} />}
    </View>
  );
});

const styles = themed(() => StyleSheet.create({
  web: { flex: 1, backgroundColor: color.groupedBackground },
}));
