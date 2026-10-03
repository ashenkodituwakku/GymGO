/**
 * Text from the legal documents (or about them) with its links working: a
 * link to another document opens it in the app, and a web link opens in the
 * in-app browser. Links are written [like this](privacy) (see legal.ts in
 * @gymgo/domain).
 */

import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { legalLinks } from '@gymgo/domain';
import { Txt } from '@/components/ui';
import { color, face } from '@/lib/theme';

type Variant = Parameters<typeof Txt>[0]['variant'];

export function LegalText({ text, variant = 'body', tint = color.label, style }: { text: string; variant?: Variant; tint?: string; style?: StyleProp<TextStyle> }) {
  const router = useRouter();
  return (
    <Txt variant={variant} color={tint} style={style}>
      {legalLinks(text).map((piece, index) =>
        'doc' in piece ? (
          <Text key={index} style={[{ color: color.brand }, face('medium')]} accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: piece.doc } })}>
            {piece.text}
          </Text>
        ) : 'url' in piece ? (
          <Text key={index} style={[{ color: color.brand }, face('medium')]} accessibilityRole="link" onPress={() => void WebBrowser.openBrowserAsync(piece.url)}>
            {piece.text}
          </Text>
        ) : (
          piece.text
        ),
      )}
    </Txt>
  );
}
