/**
 * A gym brand's logo, from Wikimedia Commons, when there is one.
 *
 * Matched by the brand's Wikidata ID (from the map) or its exact name, and
 * never for invented demo gyms. Logos are the brands' trademarks: shown only
 * to say which gym this is, credited, and with no claim of any partnership.
 */

import * as WebBrowser from 'expo-web-browser';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { GymLocation } from '@gymgo/domain';
import { BRAND_LOGOS, type BrandLogo as Logo } from '@/lib/brandLogos';
import { color, radius } from '@/lib/theme';
import { Txt } from './ui';

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function logoFor(location: GymLocation): Logo | null {
  if (location.isDemoData) return null;
  const qid = location.externalRefs.wikidataBrand;
  const byId = qid ? BRAND_LOGOS.find((logo) => logo.qid === qid) : undefined;
  if (byId) return byId;
  const names = [location.brand, location.name].filter((name): name is string => Boolean(name)).map(normalise);
  return BRAND_LOGOS.find((logo) => names.includes(normalise(logo.brand))) ?? null;
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
  return <Image source={logo.image} style={{ width: w, height: h }} resizeMode="contain" accessibilityLabel={`${logo.brand} logo`} />;
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

/** The credit a logo needs: where it's from, its licence, and that GymGO isn't the brand. */
export function LogoCredit({ location }: { location: GymLocation }) {
  const logo = logoFor(location);
  if (!logo) return null;
  return (
    <Pressable onPress={() => void WebBrowser.openBrowserAsync(logo.page)} accessibilityRole="link" hitSlop={6}>
      <Txt variant="caption" color={color.labelTertiary}>
        {logo.license.startsWith('Public domain')
          ? 'Logo via Wikimedia Commons (public domain). '
          : `Logo © ${logo.author ?? 'its author'}, ${logo.license}, via Wikimedia Commons. `}
        A trademark of {logo.brand}; GymGO isn’t connected to or endorsed by them. ↗
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
