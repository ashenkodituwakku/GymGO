/**
 * What lies behind a sheet or a panel: a tap on it closes what's open.
 *
 * Never a keyboard stop. In a browser a Pressable is always given a tab
 * stop (React Native Web), so a backdrop made of one was the first thing a
 * dialog's focus trap landed on, ringed from corner to corner (GymPal, the
 * sort and time choices), and Tab stopped on it, where Enter closed the
 * dialog. Here it's a plain view that answers a tap. Escape and the Close
 * button are the keyboard's way out. Phones keep the Pressable they had.
 */

import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

export function Backdrop({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS !== 'web') {
    return <Pressable style={style} onPress={onPress} accessible={false} importantForAccessibility="no" />;
  }
  return <View style={style} aria-hidden onStartShouldSetResponder={() => true} onResponderRelease={onPress} />;
}
