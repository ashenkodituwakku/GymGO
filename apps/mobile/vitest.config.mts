import { defineConfig } from 'vitest/config';

// Only the platform-free logic in src/lib is unit-tested here; anything that
// renders needs a device or the web preview.
export default defineConfig({
  // The theme reads Platform; react-native-web stands in for React Native in Node.
  resolve: { alias: { 'react-native': 'react-native-web' } },
  plugins: [
    {
      // A picture the app bundles (require('…/x.webp')) is its path here, as
      // Node can't load one: a test can still see which picture is which.
      name: 'bundled-pictures',
      enforce: 'pre',
      transform(code, id) {
        if (!id.includes('/src/') || !/require\('[^']+\.(?:webp|png|jpe?g)'\)/.test(code)) return null;
        return code.replace(/require\(('[^']+\.(?:webp|png|jpe?g)')\)/g, '$1');
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/**/*.test.ts'],
  },
});
