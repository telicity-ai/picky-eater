import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests of the review page in Chromium. There is no webServer:
 * each test publishes a board in its own temporary project and starts "picky-eater preview".
 * The CLI is built once from src/ by tests/helpers/global-setup.ts.
 */
const viewport = { width: 1440, height: 900 };

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './tests/helpers/global-setup.ts',
  outputDir: 'test-results/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  use: { actionTimeout: 10_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } },
  ],
});
