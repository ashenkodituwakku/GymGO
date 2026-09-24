/**
 * Icons: SF Symbols on iPhone, Material Symbols on Android and web.
 *
 * Each name is chosen per platform so the app speaks each platform's own
 * visual language — a native iOS user sees the same glyphs as in Maps, an
 * Android user sees Material's — rather than one foreign icon set everywhere.
 */

import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const ICONS = {
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  locate: { ios: 'location.fill', android: 'near_me', web: 'near_me' },
  filters: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  directions: { ios: 'arrow.triangle.turn.up.right.diamond.fill', android: 'directions', web: 'directions' },
  call: { ios: 'phone.fill', android: 'call', web: 'call' },
  website: { ios: 'safari.fill', android: 'language', web: 'language' },
  save: { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' },
  saved: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  gym: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  good: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  maybe: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  no: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  wallet: { ios: 'creditcard.fill', android: 'payments', web: 'payments' },
  door: { ios: 'door.left.hand.open', android: 'door_open', web: 'door_open' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  people: { ios: 'person.2.fill', android: 'group', web: 'group' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  pin: { ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' },
  fit: { ios: 'arrow.up.left.and.arrow.down.right', android: 'fit_screen', web: 'fit_screen' },
  account: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  cloud: { ios: 'icloud.fill', android: 'cloud', web: 'cloud' },
  offline: { ios: 'icloud.slash.fill', android: 'cloud_off', web: 'cloud_off' },
  source: { ios: 'link', android: 'link', web: 'link' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  map: { ios: 'map.fill', android: 'map', web: 'map' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'ios_share' },
  sort: { ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' },
  compare: { ios: 'rectangle.split.3x1', android: 'view_column', web: 'view_column' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  weight = 'semibold',
}: {
  name: IconName;
  size?: number;
  color: string;
  weight?: ComponentProps<typeof SymbolView>['weight'];
}) {
  return (
    <SymbolView
      name={ICONS[name] as unknown as SymbolName}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
    />
  );
}
