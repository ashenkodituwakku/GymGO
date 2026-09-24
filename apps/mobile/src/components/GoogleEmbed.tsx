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
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { color, radius, space } from '@/lib/theme';
import { Txt } from './ui';

export const EMBED_WIDTH = 440;

const openOutside = (url: string) => void WebBrowser.openBrowserAsync(url).catch(() => undefined);

function page(url: string) {
  const src = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!doctype html><html><head>
<meta name="viewport" content="width=${EMBED_WIDTH}, user-scalable=no">
<style>html,body{margin:0;height:100%;background:#E9E9EE}iframe{display:block;border:0;width:100%;height:100%}</style>
</head><body><iframe src="${src}" title="Google Maps" allowfullscreen></iframe></body></html>`;
}

export function GoogleEmbed({ url, height }: { url: string; height: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.frame, { height }]}>
      {failed ? (
        <View style={styles.failed}>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
            Google’s map didn’t load. Check the phone is online, or use the button below.
          </Txt>
        </View>
      ) : (
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
          accessibilityLabel="Google Maps"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg + 4, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: color.fill },
  web: { flex: 1, backgroundColor: 'transparent' },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[4] },
  center: { textAlign: 'center' },
});
