/**
 * Inter, for Android and browsers without SF Pro (SIL Open Font Licence).
 * iPhone uses SF Pro, built in, and bundles none of these (fonts.ios.ts).
 */
export const BUNDLED_FACES: Record<string, number> = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular').Inter_400Regular,
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium').Inter_500Medium,
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold').Inter_600SemiBold,
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold').Inter_700Bold,
};
