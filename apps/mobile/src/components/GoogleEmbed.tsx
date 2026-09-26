/**
 * Google's own map and listing card for a gym, inside the app (phones).
 *
 * The page is Google's, loaded straight from Google. Google only shows its
 * card (name, stars, number of reviews) when the embed is at least about
 * 420 px wide, and a phone is narrower, so the embed is laid out at
 * EMBED_WIDTH and the web view scales it down to fit.
 *
 * Links out of it, such as "View larger map", open in the browser or the
 * Google Maps app rather than inside this little window.
 */

import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useGoogleReach } from '@/lib/googleReach';
import { color, radius, themed } from '@/lib/theme';
import { GoogleUnavailable } from './GoogleUnavailable';

export const EMBED_WIDTH = 440;

const openOutside = (url: string) => void WebBrowser.openBrowserAsync(url).catch(() => undefined);

function page(url: string) {
  const src = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!doctype html><html><head>
<meta name="viewport" content="width=${EMBED_WIDTH}, user-scalable=no">
<style>html,body{margin:0;height:100%;background:#E9E9EE}iframe{display:block;border:0;width:100%;height:100%}</style>
</head><body><iframe src="${src}" title="Google Maps" allowfullscreen></iframe></body></html>`;
}

/**
 * `what` names the embed when it can't load ("Street View"); `caption`
 * shows under it only when it can, so it never describes an empty box.
 * Google's frame failing inside the wrapper page raises no error here, so
 * whether Google can be reached is asked first (lib/googleReach.ts).
 */
export function GoogleEmbed({ url, height, what = 'Google’s map', caption }: { url: string; height: number; what?: string; caption?: ReactNode }) {
  const { reach, retry } = useGoogleReach();
  const [failed, setFailed] = useState(false);

  if (reach !== 'ok' || failed) {
    return (
      <GoogleUnavailable
        what={what}
        height={height}
        reach={failed ? 'failed' : reach === 'ok' ? 'checking' : reach}
        onRetry={() => {
          setFailed(false);
          retry();
        }}
      />
    );
  }
  return (
    <>
      <View style={[styles.frame, { height }]}>
        <WebView
          source={{ html: page(url), baseUrl: 'https://gymgo.app/' }}
          style={styles.web}
          scalesPageToFit
          scrollEnabled={false}
          setSupportMultipleWindows
          onOpenWindow={(event) => openOutside(event.nativeEvent.targetUrl)}
          onShouldStartLoadWithRequest={(request) => {
            // The wrapper page itself, and anything inside Google's frame.
            if (!request.isTopFrame || request.url === 'https://gymgo.app/' || request.url.startsWith('about:')) return true;
            openOutside(request.url);
            return false;
          }}
          onError={() => setFailed(true)}
          accessibilityLabel={what}
        />
      </View>
      {caption}
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  frame: { borderRadius: radius.lg + 4, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: color.fill },
  web: { flex: 1, backgroundColor: 'transparent' },
}));
