import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real application.
 *
 * These run the production build, not the dev server, so what is tested is
 * what would be served. The three viewports are the widths the product claims
 * to work at.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--no-sandbox'],
      /*
       * This environment ships a Chromium build that does not match the
       * revision this Playwright version would download, so point at the one
       * that is here rather than fetching another copy. Unset the override to
       * use Playwright's own browsers elsewhere.
       */
      executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
    },
  },

  projects: [
    {
      name: 'phone-390',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'tablet-768',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: {
    command: 'pnpm start --port 3100',
    url: 'http://127.0.0.1:3100',
    // Never reuse a server already on the port. One started without the
    // sign-in variables once made every permission test fail at the login
    // step for reasons that had nothing to do with the code under test;
    // refusing to start is a clearer failure than testing the wrong server.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      GYMGO_DATA_SOURCE: 'demo',
      GYMGO_AUTH_ADAPTER: 'local-dev',
      // The local adapter is refused in a production build without this, by
      // design. Setting it here is what lets the permission flows be tested
      // against the real build.
      GYMGO_ALLOW_DEV_AUTH_IN_PROD: 'yes-i-understand',
      GYMGO_DATA_DIR: '.data-e2e',
      NEXT_DIST_DIR: '.next-e2e',
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
    },
  },
});
