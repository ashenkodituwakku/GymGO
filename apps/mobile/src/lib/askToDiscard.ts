/**
 * "Discard your changes?" before leaving a page with edits not yet saved
 * (app/session-edit.tsx): Apple's or Android's own alert on a phone, the
 * browser's own dialog on the web (react-native-web has no Alert).
 */

import { Alert, Platform } from 'react-native';

export function askToDiscard(what: string, onDiscard: () => void): void {
  const title = 'Discard your changes?';
  const message = `Your changes to ${what} haven’t been saved.`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onDiscard();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Keep editing', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: onDiscard },
  ]);
}
