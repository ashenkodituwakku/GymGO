/**
 * A gym brand's logo, from Wikimedia Commons, when there is one.
 *
 * Matched as lib/logoMatch.ts explains: by the brand's Wikidata ID or its
 * exact name, never loosely, and never for invented demo gyms. Logos are the
 * brands' trademarks: shown only to say which gym this is, credited, and
 * with no claim of any partnership.
 */

import * as WebBrowser from 'expo-web-browser';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { GymLocation } from '@gymgo/domain';
import { LOGO_IMAGES } from '@/lib/brandLogoImages';
import { BRAND_LOGOS, type BrandLogo as Logo } from '@/lib/brandLogos';
import { matchLogo } from '@/lib/logoMatch';
import { color, radius } from '@/lib/theme';
import { Txt } from './ui';

export function logoFor(location: GymLocation): Logo | null {
  return matchLogo(location, BRAND_LOGOS);
}

/**
 * The logo alone, fitted inside width × height and never stretched. Logos are
 * balanced by area, as on a sponsor wall, so a wide wordmark and a round badge
 * look the same size.
 */
export function BrandLogo({ location, width, height, area }: { location: GymLocation; width: number; height: number; area: number }) {
  const logo = logoFor(location);
  if (!logo) return null;
  let w = Math.sqrt(area * logo.aspect);
  let h = w / logo.aspect;
  const shrink = Math.min(1, width / w, height / h);
  w *= shrink;
  h *= shrink;
  return <Image source={LOGO_IMAGES[logo.slug]} style={{ width: w, height: h }} resizeMode="contain" accessibilityLabel={`${logo.brand} logo`} />;
}

/** The logo on a white plate, for the top of a gym's page. */
export function LogoPlate({ location }: { location: GymLocation }) {
  if (!logoFor(location)) return null;
  return (
    <View style={styles.plate}>
      <BrandLogo location={location} width={170} height={52} area={3200} />
    </View>
  );
}

/** A small logo plate, for the header of a gym's card. */
export function LogoBadge({ location }: { location: GymLocation }) {
  if (!logoFor(location)) return null;
  return (
    <View style={[styles.plate, styles.badge]}>
      <BrandLogo location={location} width={84} height={30} area={1100} />
    </View>
  );
}

/** The credit a logo needs: where it's from, its licence, and that GymGO isn't the brand. */
export function LogoCredit({ location }: { location: GymLocation }) {
  const logo = logoFor(location);
  if (!logo) return null;
  return (
    <Pressable onPress={() => void WebBrowser.openBrowserAsync(logo.page)} accessibilityRole="link" hitSlop={6}>
      <Txt variant="caption" color={color.labelSecondary}>
        {logo.license.startsWith('Public domain')
          ? 'Logo via Wikimedia Commons (public domain). '
          : `Logo © ${logo.author ?? 'its author'}, ${logo.license}, via Wikimedia Commons. `}
        A trademark of {logo.brand}; GymGO isn’t connected to or endorsed by them. ↗
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 6, marginBottom: 0, alignSelf: 'auto', borderRadius: radius.md },
  plate: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.separator,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
});
