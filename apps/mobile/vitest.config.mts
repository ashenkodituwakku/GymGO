import { defineConfig } from 'vitest/config';

// Only the platform-free logic in src/lib is unit-tested here; anything that
// renders needs a device or the web preview.
export default defineConfig({
  // The theme reads Platform; react-native-web stands in for React Native in Node.
  resolve: { alias: { 'react-native': 'react-native-web' } },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/**/*.test.ts'],
  },
});
