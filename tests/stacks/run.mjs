#!/usr/bin/env node
/**
 * Runs picky-eater against real development servers.
 *
 *   node tests/stacks/run.mjs                 every stack
 *   node tests/stacks/run.mjs vite-react next only these
 *   node tests/stacks/run.mjs --list          names
 *   node tests/stacks/run.mjs --serve next    install and start one, and leave it running
 *   --keep    leave node_modules in the fixtures (faster next time, a few hundred MB each)
 *   --cache   a folder for npm's download cache (default: npm's own)
 *
 * For each stack: install its packages, start its development server, publish the shared board
 * over the page, and let tests/stacks/stack.spec.ts drive the review in a browser. Results go to
 * test-results/stack-logs/results.json.
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STACKS } from './stacks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const names = argv.filter((a, i) => !a.startsWith('--') && !['--serve', '--cache'].includes(argv[i - 1]));

if (flag('--list')) {
  for (const s of STACKS) console.log(`${s.name.padEnd(18)} ${s.title}`);
  process.exit(0);
}

const serve = value('--serve');
const wanted = serve ? [serve] : names.length ? names : STACKS.map((s) => s.name);
const unknown = wanted.filter((n) => !STACKS.some((s) => s.name === n));
if (unknown.length) {
  console.error(`Unknown stack: ${unknown.join(', ')}. Run with --list.`);
  process.exit(1);
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function answers(url, ms, stopped) {
  const until = Date.now() + ms;
  while (Date.now() < until && !stopped()) {
    try {
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  return false;
}

function versions(dir, packages) {
  const out = {};
  for (const name of packages ?? []) {
    try {
      out[name] = JSON.parse(readFileSync(join(dir, 'node_modules', name, 'package.json'), 'utf8')).version;
    } catch {
      out[name] = '?';
    }
  }
  return out;
}

const LEFTOVERS = ['.picky-eater', '.next', '.nuxt', '.output', '.svelte-kit', '.astro', '.angular', '.react-router', '.parcel-cache', 'dist', 'next-env.d.ts', 'AGENTS.md', 'package-lock.json'];

async function run(stack) {
  // A fixture of the matrix, or a folder of the repository that is an app of its own (an example).
  const dir = stack.dir ? join(repo, stack.dir) : join(here, 'fixtures', stack.name);
  const logDir = join(repo, 'test-results', 'stack-logs');
  mkdirSync(logDir, { recursive: true });
  const result = { name: stack.name, title: stack.title, ok: false, versions: {}, page: null, seconds: 0, error: '' };
  const started = Date.now();
  let dev = null;
  try {
    if (stack.css) copyFileSync(join(here, 'trailhead.css'), join(dir, stack.css));
    if (!existsSync(join(dir, 'node_modules'))) {
      console.log(`[${stack.name}] installing…`);
      const cache = value('--cache');
      // An app with a lockfile of its own is installed from it; a fixture only pins what it names.
      const how = existsSync(join(dir, 'package-lock.json')) ? ['ci'] : ['install', '--no-package-lock'];
      const install = spawnSync('npm', [...how, '--no-audit', '--no-fund', '--loglevel=error', ...(cache ? ['--cache', cache] : [])], { cwd: dir, encoding: 'utf8' });
      if (install.status !== 0) throw new Error(`npm install failed:\n${(install.stderr || install.stdout).slice(-2000)}`);
    }
    result.versions = versions(dir, stack.packages);
    const port = await freePort();
    const url = `http://localhost:${port}/`;
    const log = join(logDir, `${stack.name}.dev.log`);
    writeFileSync(log, '');
    console.log(`[${stack.name}] starting: ${stack.dev.replaceAll('{port}', String(port))}`);
    dev = spawn(stack.dev.replaceAll('{port}', String(port)), { cwd: dir, shell: true, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port), BROWSER: 'none', CI: '1', NO_COLOR: '1', ...(stack.env ?? {}) } });
    const append = (chunk) => writeFileSync(log, chunk, { flag: 'a' });
    dev.stdout.on('data', append);
    dev.stderr.on('data', append);
    let exited = null;
    dev.once('exit', (code) => (exited = code));
    if (!(await answers(url, stack.startMs ?? 120_000, () => exited !== null && exited !== 0))) throw new Error(`the development server did not answer at ${url}${exited !== null ? ` (it stopped with code ${exited})` : ''}; see ${log}`);
    if (serve) {
      console.log(`[${stack.name}] running at ${url} (Ctrl+C stops it)`);
      await new Promise((resolve) => {
        const keep = setInterval(() => {}, 60_000);
        for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => (clearInterval(keep), resolve()));
      });
      return result;
    }
    console.log(`[${stack.name}] testing ${url}`);
    const test = spawnSync('npx', ['playwright', 'test', '-c', join(here, 'playwright.config.ts')], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, PE_STACK: JSON.stringify({ ...stack, dir, url, notes: join(logDir, `${stack.name}.page.json`) }), PE_STACK_SPEC: stack.spec ?? 'stack.spec.ts' },
      maxBuffer: 64 * 1024 * 1024,
    });
    writeFileSync(join(logDir, `${stack.name}.test.log`), `${test.stdout}\n${test.stderr}`);
    result.ok = test.status === 0;
    try {
      result.page = JSON.parse(readFileSync(join(logDir, `${stack.name}.page.json`), 'utf8'));
    } catch {
      /* the test did not get as far as looking at the page */
    }
    if (!result.ok) result.error = (test.stdout + test.stderr).split('\n').filter((l) => l.trim()).slice(0, 60).join('\n');
  } catch (err) {
    result.error = String(err.message ?? err);
  } finally {
    if (dev?.pid) {
      try {
        process.kill(-dev.pid, 'SIGTERM');
      } catch {
        /* already gone */
      }
      await sleep(500);
      try {
        process.kill(-dev.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    // A development server that puts itself in the background has its own way of being stopped.
    if (stack.stop) spawnSync(stack.stop, { cwd: dir, shell: true, encoding: 'utf8', env: { ...process.env, ...(stack.env ?? {}) } });
    spawnSync(process.execPath, [join(repo, 'skills/picky-eater/scripts/picky-eater.mjs'), 'preview', '--stop', '--root', dir], { encoding: 'utf8' });
    for (const name of stack.dir ? ['.picky-eater'] : LEFTOVERS) rmSync(join(dir, name), { recursive: true, force: true });
    if (stack.css) rmSync(join(dir, stack.css), { force: true });
    if (!flag('--keep')) rmSync(join(dir, 'node_modules'), { recursive: true, force: true });
  }
  result.seconds = Math.round((Date.now() - started) / 1000);
  console.log(`[${stack.name}] ${result.ok ? 'ok' : 'FAILED'} in ${result.seconds}s${result.ok ? '' : `\n${result.error}`}`);
  return result;
}

const build = spawnSync(process.execPath, [join(repo, 'scripts', 'build.mjs')], { cwd: repo, encoding: 'utf8' });
if (build.status !== 0) {
  console.error(build.stdout + build.stderr);
  process.exit(1);
}

const results = [];
for (const name of wanted) results.push(await run(STACKS.find((s) => s.name === name)));

mkdirSync(join(repo, 'test-results', 'stack-logs'), { recursive: true });
writeFileSync(join(repo, 'test-results', 'stack-logs', 'results.json'), JSON.stringify({ at: new Date().toISOString(), node: process.version, platform: process.platform, results }, null, 2));
console.log('');
for (const r of results) console.log(`${r.ok ? 'ok    ' : 'FAILED'} ${r.name.padEnd(18)} ${Object.entries(r.versions).map(([k, v]) => `${k} ${v}`).join(', ')}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
