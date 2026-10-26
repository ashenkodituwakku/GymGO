/**
 * One of GymGO's legal documents: the Terms of Service, Privacy Policy,
 * Refunds and Cancelling, or Community Guidelines. The same text is on the
 * server's public pages (/terms and the rest) for anyone without the app.
 */

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LEGAL_UPDATED, isLegalDocId, legalDoc } from '@gymgo/domain';
import { LegalText } from '@/components/LegalText';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { Txt } from '@/components/ui';
import { ScreenOptions } from '@/components/ScreenOptions';
import { useLegalInfo } from '@/lib/legal';
import { usePageTitle } from '@/lib/pageTitle';
import { color, radius, shadow, space, themed } from '@/lib/theme';

export default function LegalScreen() {
  useGlassRedraw();
  const params = useLocalSearchParams<{ doc?: string }>();
  const id = isLegalDocId(params.doc) ? params.doc : 'terms';
  const { operator } = useLegalInfo();
  const doc = legalDoc(id, operator);
  usePageTitle(doc.title);
  // Long reading: a little wider in the wide layout, not so wide the lines are hard to follow.
  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} wideWidth={820}>
      <ScreenOptions options={{ title: doc.title }} />
      <View style={styles.head}>
        {/* Not a heading: the bar above titles the page with the same words, and two read as one twice. */}
        <Txt variant="title">
          {doc.title}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Last updated {LEGAL_UPDATED}
        </Txt>
      </View>
      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Txt variant="headline" accessibilityRole="header" level={2}>
            {section.heading}
          </Txt>
          {section.blocks.map((block, index) =>
            typeof block === 'string' ? (
              <LegalText key={index} text={block} variant="subhead" tint={color.labelSecondary} />
            ) : (
              <View key={index} style={styles.list}>
                {block.list.map((item) => (
                  <View key={item} style={styles.item}>
                    <Txt variant="subhead" color={color.labelTertiary}>
                      •
                    </Txt>
                    <LegalText text={item} variant="subhead" tint={color.labelSecondary} style={styles.flex} />
                  </View>
                ))}
              </View>
            ),
          )}
        </View>
      ))}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[3], width: '100%', maxWidth: 680, alignSelf: 'center' },
    head: { gap: space[1], paddingHorizontal: space[1], paddingBottom: space[1] },
    section: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    list: { gap: space[2] },
    item: { flexDirection: 'row', gap: space[2] },
    flex: { flex: 1 },
  }),
);
