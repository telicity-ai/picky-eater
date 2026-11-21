import { defineConfig, devices } from '@playwright/test';

/** One stack at a time, started by run.mjs, which passes it in PE_STACK and names the test that fits it. */
export default defineConfig({
  testDir: '.',
  testMatch: process.env.PE_STACK_SPEC ?? 'stack.spec.ts',
  outputDir: '../../test-results/stacks',
  timeout: 300_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { actionTimeout: 15_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
