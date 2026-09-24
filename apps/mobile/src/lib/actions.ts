/**
 * Things you can do with a gym from anywhere in the app: share it, or get
 * directions. Each says whether it worked, so the caller can explain when
 * it didn't. Invented demo gyms can't be shared or routed to.
 */

import { Linking, Platform, Share } from 'react-native';
import type { GymRecord } from '@gymgo/domain';
import { googleMapsSearchUrl } from './present';

export async function shareGym(record: GymRecord): Promise<boolean> {
  const { name, address, website, isDemoData } = record.location;
  if (isDemoData) return false;
  const where = [address.line1, address.suburb].filter(Boolean).join(', ');
  const link = website ?? googleMapsSearchUrl(record);
  try {
    await Share.share(
      Platform.OS === 'ios' ? { message: `${name}, ${where}`, url: link } : { message: `${name}, ${where}\n${link}`, title: name },
    );
    return true;
  } catch {
    return false;
  }
}

export async function openDirections(record: GymRecord): Promise<boolean> {
  const { name, position, isDemoData } = record.location;
  if (isDemoData) return false;
  const { lat, lng } = position;
  const label = encodeURIComponent(name);
  const url = Platform.select({
    ios: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
