/**
 * One of GymGO's legal documents: the Terms of Service, Privacy Policy,
 * Refunds and Cancelling, or Community Guidelines. The same text is on the
 * server's public pages (/terms and the rest) for anyone without the app.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LEGAL_UPDATED, isLegalDocId, legalDoc } from '@gymgo/domain';
import { LegalText } from '@/components/LegalText';
import { PageScroll } from '@/components/PageScroll';
import { Txt } from '@/components/ui';
import { useLegalInfo } from '@/lib/legal';
import { usePageTitle } from '@/lib/pageTitle';
import { color, radius, shadow, space, themed } from '@/lib/theme';

export default function LegalScreen() {
  const params = useLocalSearchParams<{ doc?: string }>();
  const id = isLegalDocId(params.doc) ? params.doc : 'terms';
  const { operator } = useLegalInfo();
  const doc = legalDoc(id, operator);
  usePageTitle(doc.title);
  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: doc.title }} />
      <View style={styles.head}>
        <Txt variant="title" accessibilityRole="header">
          {doc.title}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Last updated {LEGAL_UPDATED}
        </Txt>
      </View>
      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Txt variant="headline" accessibilityRole="header">
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
    section: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, ...shadow.plate },
    list: { gap: space[2] },
    item: { flexDirection: 'row', gap: space[2] },
    flex: { flex: 1 },
  }),
);
