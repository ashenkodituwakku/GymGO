import { defineConfig } from 'vitest/config';

// Only the platform-free logic in src/lib is unit-tested here; anything that
// renders needs a device or the web preview.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/**/*.test.ts'],
  },
});
