import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Builds the CLI once from src/ into a temporary folder, so tests always run the current
 * sources and never depend on the committed bundle. Used by both vitest and Playwright.
 */
export default function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'picky-eater-cli-'));
  const cli = join(dir, 'picky-eater.mjs');
  execFileSync(process.execPath, [resolve('scripts/build.mjs'), '--out', cli], { stdio: 'inherit' });
  process.env.PE_TEST_CLI = cli;
  // What a test approves is remembered here, never in the home folder of whoever runs the tests.
  process.env.PICKY_EATER_HOME = join(dir, 'home');
  return () => rmSync(dir, { recursive: true, force: true });
}
