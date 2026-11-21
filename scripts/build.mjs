#!/usr/bin/env node
// Builds the self-contained CLI at skills/picky-eater/scripts/picky-eater.mjs (CLI, review server,
// stage listener, review page, stage agent and pattern catalog; no runtime dependencies) and the
// files generated from it: schemas/board.schema.json and docs/patterns.md.
//
//   node scripts/build.mjs            build everything
//   node scripts/build.mjs --check    fail if a committed output is out of date
//   node scripts/build.mjs --out <f>  build only the CLI, to another location (tests)
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const outIndex = process.argv.indexOf('--out');
const customOut = outIndex > 0 ? resolve(process.argv[outIndex + 1] ?? '') : null;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const cliFile = 'skills/picky-eater/scripts/picky-eater.mjs';
const noticesFile = 'skills/picky-eater/THIRD_PARTY_NOTICES.md';

async function buildUi() {
  const js = await build({
    entryPoints: [join(root, 'src/review/app.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    minify: true,
    legalComments: 'none',
    loader: { '.css': 'text' }, // stylesheets that are injected into mockups
  });
  const css = await build({
    entryPoints: [join(root, 'src/review/styles.css')],
    bundle: true,
    write: false,
    minify: true,
  });
  // The one script that runs inside the user's app on boards over an existing page.
  const agent = await build({
    entryPoints: [join(root, 'src/stage/agent.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    minify: true,
    legalComments: 'none',
  });
  // What the headless browser of "implement" and "check" evaluates in a page: the probe that
  // measures it, and the composer that turns a revision into the approved mockup.
  const inPage = (entry) =>
    build({ entryPoints: [join(root, entry)], bundle: true, write: false, format: 'iife', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'none', loader: { '.css': 'text' } });
  const probe = await inPage('src/check/probe.ts');
  const composer = await inPage('src/check/composer.ts');
  return {
    'agent.js': agent.outputFiles[0].text,
    'probe.js': probe.outputFiles[0].text,
    'composer.js': composer.outputFiles[0].text,
    'index.html': readFileSync(join(root, 'src/review/index.html'), 'utf8'),
    'app.js': js.outputFiles[0].text,
    'app.css': css.outputFiles[0].text,
  };
}

function readCatalog() {
  const dir = join(root, 'catalog');
  const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const patterns = join(dir, 'patterns');
  return {
    references: existsSync(join(dir, 'references.json')) ? json(join(dir, 'references.json')) : [],
    decisions: existsSync(join(dir, 'decisions.json')) ? json(join(dir, 'decisions.json')) : [],
    patternFiles: existsSync(patterns)
      ? readdirSync(patterns)
          .filter((f) => f.endsWith('.json'))
          .sort()
          .map((f) => json(join(patterns, f)))
      : [],
  };
}

// Zod bundles every locale; keep only English to cut the bundle size.
const zodEnglishOnly = {
  name: 'zod-english-only',
  setup(b) {
    b.onLoad({ filter: /zod[\\/]v4[\\/]locales[\\/]index\.js$/ }, () => ({
      contents: "export { default as en } from './en.js';",
      loader: 'js',
    }));
  },
};

// Third-party code inlined into the bundle. Its license notice must travel with the bundle.
const zodVersion = JSON.parse(readFileSync(join(root, 'node_modules/zod/package.json'), 'utf8')).version;
const zodLicense = readFileSync(join(root, 'node_modules/zod/LICENSE'), 'utf8').trim();
const noticesText = `# Third-party notices\n\n\`scripts/picky-eater.mjs\` bundles the following open-source software.\n\n## zod ${zodVersion}\n\nhttps://github.com/colinhacks/zod\n\n\`\`\`\n${zodLicense}\n\`\`\`\n`;

async function buildCli(target) {
  await build({
    entryPoints: [join(root, 'src/cli/bin.ts')],
    bundle: true,
    outfile: target,
    format: 'esm',
    platform: 'node',
    target: ['node22'],
    minify: false,
    legalComments: 'none',
    loader: { '.css': 'text' }, // "picky-eater kit" prints the component kit
    banner: {
      js: [
        '#!/usr/bin/env node',
        `// picky-eater ${pkg.version} — ${pkg.homepage.replace('#readme', '')} (MIT License)`,
        '// GENERATED FILE: built from src/ by scripts/build.mjs. Do not edit by hand.',
        `// Includes zod ${zodVersion} (MIT License); see THIRD_PARTY_NOTICES.md.`,
      ].join('\n'),
    },
    define: { __PE_UI_ASSETS__: JSON.stringify(await buildUi()), __PE_CATALOG__: JSON.stringify(readCatalog()) },
    plugins: [zodEnglishOnly],
    logLevel: 'warning',
  });
}

/** Files derived from the built CLI, by path relative to the repository root. */
function generated(cli) {
  const run = (...args) => execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return {
    'schemas/board.schema.json': run('schema'),
    'docs/patterns.md': run('patterns', '--markdown'),
    [noticesFile]: noticesText,
  };
}

if (customOut) {
  mkdirSync(dirname(customOut), { recursive: true });
  await buildCli(customOut);
} else if (check) {
  const tmp = mkdtempSync(join(tmpdir(), 'picky-eater-build-'));
  try {
    const cli = join(tmp, 'picky-eater.mjs');
    await buildCli(cli);
    const stale = [];
    const same = (file, text) => existsSync(join(root, file)) && readFileSync(join(root, file), 'utf8') === text;
    if (!same(cliFile, readFileSync(cli, 'utf8'))) stale.push(cliFile);
    for (const [file, text] of Object.entries(generated(cli))) if (!same(file, text)) stale.push(file);
    if (stale.length) {
      console.error(`Build outputs are out of date:\n  ${stale.join('\n  ')}\nRun "npm run build" and commit the result.`);
      process.exit(1);
    }
    console.log('Build outputs are up to date.');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
} else {
  const cli = join(root, cliFile);
  mkdirSync(dirname(cli), { recursive: true });
  await buildCli(cli);
  for (const [file, text] of Object.entries(generated(cli))) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  console.log(`Built ${cliFile}, schemas/board.schema.json and docs/patterns.md.`);
}
