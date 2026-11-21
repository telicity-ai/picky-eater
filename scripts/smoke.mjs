#!/usr/bin/env node
// Runs the committed CLI bundle with Node.js built-ins only, the way an installed skill runs:
// no npm install, no build. Publishes the example board, starts the review page, reads it, stops.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'skills/picky-eater/scripts/picky-eater.mjs');
const dir = mkdtempSync(join(tmpdir(), 'picky-eater-smoke-'));
const pe = (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
const check = (ok, what) => {
  if (!ok) throw new Error(`Smoke test failed: ${what}`);
  console.log(`ok  ${what}`);
};

try {
  check(/^\d+\.\d+\.\d+$/.test(pe('--version').trim()), 'prints its version');
  pe('new', '--title', 'Workshop sign-up', '--from', join(root, 'examples/new-screen/board'));
  check(JSON.parse(pe('validate', '--json')).ok === true, 'the example board is valid');
  check(JSON.parse(pe('propose', '--json')).revision === 1, 'publishes revision 1');
  check(pe('patterns', 'switch').startsWith('switch — '), 'looks up a pattern');
  const { link, port } = JSON.parse(pe('preview', '--json'));
  check(/^http:\/\/127\.0\.0\.1:\d+\/#token=/.test(link), 'starts the review page');
  const page = await fetch(`http://127.0.0.1:${port}/`);
  check(page.ok && (await page.text()).includes('<title>picky-eater</title>'), 'serves the review page');
  check((await fetch(`http://127.0.0.1:${port}/api/state`)).status === 401, 'refuses the API without the token');
  check(pe('preview', '--stop').includes('Preview stopped'), 'stops the review page');
  let exit = 0;
  try {
    pe('wait', '--timeout', '0');
  } catch (err) {
    exit = err.status;
  }
  check(exit === 124, 'wait reports that nobody has approved');
} finally {
  try {
    pe('preview', '--stop');
  } catch {
    /* already stopped */
  }
  rmSync(dir, { recursive: true, force: true });
}
