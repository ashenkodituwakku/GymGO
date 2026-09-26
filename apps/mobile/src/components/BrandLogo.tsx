/**
 * A gym's mark: its brand's logo from Wikimedia Commons when there is one,
 * otherwise the icon the gym publishes on its own website.
 *
 * Commons logos are matched as lib/logoMatch.ts explains: by the brand's
 * Wikidata ID or its exact name, never loosely. Website icons come through
 * the GymGO server (apps/server/src/siteicons.ts), which fetches them
 * carefully and keeps them; the app shows one only once it has actually
 * loaded, and shows nothing at all when there isn't one. Neither is ever
 * shown for invented demo gyms.
 *
 * Logos and icons are their owners' trademarks: shown only to say which gym
 * this is, credited, and with no claim of any partnership.
 */

import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { GymLocation } from '@gymgo/domain';
import { apiBase } from '@/lib/api';
import { LOGO_IMAGES } from '@/lib/brandLogoImages';
import { BRAND_LOGOS, type BrandLogo as Logo } from '@/lib/brandLogos';
import { matchLogo } from '@/lib/logoMatch';
import { color, radius, themed } from '@/lib/theme';
import { Txt } from './ui';
import { FADE_IN } from './motion';

export function logoFor(location: GymLocation): Logo | null {
  return matchLogo(location, BRAND_LOGOS);
}

// --- The website icon --------------------------------------------------------

/** What's known about each gym's website icon this session: its size, or null for none. */
const siteIcons = new Map<string, { width: number; height: number } | null>();

/** Where the server has the gym's website icon; a branch with no site of its own may have its chain's. */
function siteIconUri(location: GymLocation): string | null {
  const base = apiBase();
  const chain = location.brand || location.externalRefs.wikidataBrand;
  if (!base || location.isDemoData || (!location.website && !chain)) return null;
  return `${base}/api/gyms/${encodeURIComponent(location.id)}/icon`;
}

/** The gym's website icon once it has loaded, or null (none, not yet, or not needed). */
function useSiteIcon(location: GymLocation, wanted: boolean): { uri: string; aspect: number } | null {
  const uri = wanted ? siteIconUri(location) : null;
  const [size, setSize] = useState(() => (uri ? siteIcons.get(location.id) : null));
  useEffect(() => {
    if (!uri) return;
    if (siteIcons.has(location.id)) {
      setSize(siteIcons.get(location.id));
      return;
    }
    let live = true;
    Image.getSize(
      uri,
      (width, height) => {
        siteIcons.set(location.id, { width, height });
        if (live) setSize({ width, height });
      },
      () => {
        siteIcons.set(location.id, null);
        if (live) setSize(null);
      },
    );
    return () => {
      live = false;
    };
  }, [uri, location.id]);
  return uri && size ? { uri, aspect: size.width / size.height } : null;
}

type Mark = { kind: 'brand'; logo: Logo } | { kind: 'site'; uri: string; aspect: number };

/** The best mark for this gym: the Commons logo, else its website icon, else null. */
export function useGymMark(location: GymLocation): Mark | null {
  const logo = logoFor(location);
  const site = useSiteIcon(location, !logo);
  if (logo) return { kind: 'brand', logo };
  return site ? { kind: 'site', ...site } : null;
}

/**
 * The mark alone, fitted inside width × height and never stretched. Marks are
 * balanced by area, as on a sponsor wall, so a wide wordmark and a round badge
 * look the same size. A square website icon gets an app icon's rounded corners.
 */
export function MarkImage({ mark, name, width, height, area }: { mark: Mark; name: string; width: number; height: number; area: number }) {
  const aspect = mark.kind === 'brand' ? mark.logo.aspect : mark.aspect;
  let w = Math.sqrt(area * aspect);
  let h = w / aspect;
  const shrink = Math.min(1, width / w, height / h);
  w *= shrink;
  h *= shrink;
  if (mark.kind === 'brand') {
    return <Image source={LOGO_IMAGES[mark.logo.slug]} style={{ width: w, height: h }} resizeMode="contain" accessibilityLabel={`${mark.logo.brand} logo`} />;
  }
  const square = aspect > 0.8 && aspect < 1.25;
  return (
    <Animated.Image
      entering={FADE_IN}
      source={{ uri: mark.uri }}
      style={{ width: w, height: h, borderRadius: square ? Math.min(w, h) * 0.22 : 0 }}
      resizeMode="contain"
      accessibilityLabel={`${name} logo`}
    />
  );
}

/** The gym's mark, or nothing. */
export function BrandLogo({ location, width, height, area }: { location: GymLocation; width: number; height: number; area: number }) {
  const mark = useGymMark(location);
  return mark ? <MarkImage mark={mark} name={location.name} width={width} height={height} area={area} /> : null;
}

/** The mark on a white plate, for the top of a gym's page. */
export function LogoPlate({ location }: { location: GymLocation }) {
  const mark = useGymMark(location);
  if (!mark) return null;
  return (
    <View style={styles.plate}>
      <MarkImage mark={mark} name={location.name} width={170} height={52} area={3200} />
    </View>
  );
}

/** A small mark, for the header of a gym's card. */
export function LogoBadge({ location }: { location: GymLocation }) {
  const mark = useGymMark(location);
  if (!mark) return null;
  return (
    <View style={[styles.plate, styles.badge]}>
      <MarkImage mark={mark} name={location.name} width={84} height={30} area={1100} />
    </View>
  );
}

function host(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

/** The credit a mark needs: where it's from, its licence, and that GymGO isn't the brand. */
export function LogoCredit({ location }: { location: GymLocation }) {
  const mark = useGymMark(location);
  if (!mark) return null;
  if (mark.kind === 'site') {
    if (!location.website) {
      // A branch the map gives no website: the icon is from its chain's.
      return (
        <Txt variant="caption" color={color.labelSecondary}>
          Icon from {location.brand ?? location.name}’s own website. It’s their mark; GymGO isn’t connected to or endorsed by them.
        </Txt>
      );
    }
    return (
      <Pressable onPress={() => void WebBrowser.openBrowserAsync(location.website!)} accessibilityRole="link" hitSlop={6}>
        <Txt variant="caption" color={color.labelSecondary}>
          Icon from {host(location.website)}, the gym’s own website. It’s their mark; GymGO isn’t connected to or endorsed by them. ↗
        </Txt>
      </Pressable>
    );
  }
  const { logo } = mark;
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

const styles = themed(() => StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 6, marginBottom: 0, alignSelf: 'auto', borderRadius: radius.md },
  plate: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: color.logoPlate,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.separator,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
}));
