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
 * Not shown here: the blue "you are here" dot. Locating still works; it
 * centres the map and the list on you.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { mapPageHtml, type PageMessage } from './mapPage';
import { TIER_COLOUR } from './ui';
import type { GymMapHandle, GymMapProps } from './map-types';

export type { GymMapHandle, MapPin } from './map-types';

const COLOURS = Object.fromEntries(Object.entries(TIER_COLOUR).map(([tier, tone]) => [tier, tone.fill]));

export const GymMap = forwardRef<GymMapHandle, GymMapProps>(function GymMap(
  { pins, selectedId, initialCentre, bottomInset, topInset, userLocation = null, onSelect, onMapPress, onRegionChange },
  ref,
) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const queue = useRef<string[]>([]);
  const handlers = useRef({ onSelect, onMapPress, onRegionChange });
  handlers.current = { onSelect, onMapPress, onRegionChange };

  // Built once: the page keeps its own camera from then on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => mapPageHtml({ centre: initialCentre, colours: COLOURS }), []);

  /** Run a call in the page, or hold it until the page says it's ready. */
  const run = useCallback((script: string) => {
    if (ready.current) web.current?.injectJavaScript(`${script};true;`);
    else queue.current.push(script);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(centre, span = 0.03) {
        const zoom = Math.log2(360 / span) - 0.6;
        run(`gymgo.flyTo(${centre.lat},${centre.lng},${zoom})`);
      },
      fitTo(points) {
        run(`gymgo.fitTo(${JSON.stringify(points)})`);
      },
    }),
    [run],
  );

  useEffect(() => {
    run(`gymgo.setPins(${JSON.stringify(pins)},${JSON.stringify(selectedId)})`);
  }, [pins, selectedId, run]);

  useEffect(() => {
    run(userLocation ? `gymgo.setUser(${userLocation.lat},${userLocation.lng})` : 'gymgo.setUser(null,null)');
  }, [userLocation, run]);

  useEffect(() => {
    run(`gymgo.setPadding(${Math.round(topInset)},${Math.round(bottomInset)})`);
  }, [topInset, bottomInset, run]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let message: PageMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as PageMessage;
    } catch {
      return;
    }
    if (message.type === 'ready') {
      ready.current = true;
      const pending = queue.current.splice(0);
      for (const script of pending) web.current?.injectJavaScript(`${script};true;`);
    } else if (message.type === 'select') {
      handlers.current.onSelect(message.id);
    } else if (message.type === 'mapPress') {
      handlers.current.onMapPress();
    } else if (message.type === 'moved') {
      handlers.current.onRegionChange?.(message.box);
    } else if (message.type === 'error') {
      console.warn('[map]', message.message);
    }
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={web}
        source={{ html }}
        originWhitelist={['*']}
        onMessage={onMessage}
        // A reload (e.g. the system reclaimed the web view) starts the page
        // over, so re-queue until it says it's ready again.
        onLoadStart={() => {
          ready.current = false;
        }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        setBuiltInZoomControls={false}
        androidLayerType="hardware"
        style={styles.web}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#F2F2F7' },
});
