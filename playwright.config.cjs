const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  globalSetup: require.resolve('./tests/browser-setup.cjs'),
  use: {
    baseURL: 'http://127.0.0.1:4337',
    viewport: { width: 390, height: 844 },
    timezoneId: 'America/New_York',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
});
