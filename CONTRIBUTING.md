# Contributing to picky-eater

Thanks for helping. This project is small on purpose: one portable skill, one bundled CLI, one
local review page. Contributions that make the storyboard flow more reliable, more accessible, or
the pattern catalog more accurate are the most valuable.

## Development setup

Requirements: Node.js 22.12 or newer, npm and git.

```sh
git clone https://github.com/telicity-ai/picky-eater.git
cd picky-eater
npm ci
npm run build          # bundles src/ and catalog/ into skills/picky-eater/scripts/picky-eater.mjs
npm test               # unit and integration tests (Vitest)
npx playwright install chromium
npm run test:e2e       # browser tests of the review page, in Chromium
npm run typecheck
npm run test:stacks    # optional: against real development servers (installs each framework; see tests/stacks)
```

To try a change by hand, publish the example board and open the review page:

```sh
mkdir /tmp/try && cd /tmp/try
alias pe="node /path/to/picky-eater/skills/picky-eater/scripts/picky-eater.mjs"
pe new --title "Workshop sign-up" --from /path/to/picky-eater/examples/new-screen/board
pe propose && pe preview --open
```

## Repository structure

| Path | Contents |
|---|---|
| `skills/picky-eater/` | **The installable skill.** `SKILL.md`, `references/`, `agents/openai.yaml`, `scripts/picky-eater.mjs` (generated) |
| `catalog/` | The pattern catalog. Its [README](catalog/README.md) defines the format |
| `src/core/` | Board schema, mockup checks, area graph, draft validation, patch engine. Runs in Node and in the browser |
| `src/session/` | `.picky-eater/` state: revisions, choices, change requests, approvals |
| `src/server/` | The review listener, the stage listener (the address a user's app is shown from) and their access rules |
| `src/stage/` | The stage agent: the one script that runs inside a user's app, and its message protocol; the keeper that holds patches on a page that redraws itself; what frameworks tell about a page |
| `src/review/` | The review page: page composer, the two stages (mockup, running app), miniature renderer, UI |
| `src/kit/` | Stylesheets added to mockups (sketch kit, component kit) and the snippets of catalog patterns |
| `src/catalog/` | Catalog validation, lookup and rendering |
| `src/check/` | The headless browser driver (DevTools protocol), the probe that measures a page, `implement` / `check` / `report`, and looking at a running page (`inspect`, the page check of `validate`) |
| `src/cli/` | Command-line interface |
| `schemas/`, `docs/patterns.md` | Generated from the sources |
| `examples/new-screen/` | A complete board for a new screen, also used by the tests |
| `examples/static-site/` | A small site, its development server and a board over it, also used by the tests |
| `examples/react-app/` | A React app with a board over its settings page; tested by `tests/stacks` |
| `tests/unit`, `tests/integration`, `tests/e2e` | Vitest unit and integration tests; Playwright browser tests |
| `tests/e2e/pages/` | Pages for those tests: `rerender` redraws itself the ways frameworks do; `app` is an app screen behind a sign-in, with a list that grows and a dialog that is drawn late |
| `tests/stacks/` | The same page in 14 frameworks and development servers, and the runner that starts each one and plays a review of it. Not part of `npm test`; see its [README](tests/stacks/README.md) |
| `docs/` | Concept and plan, pattern catalog, installation, compatibility |

Generated files, **never edited by hand**: `skills/picky-eater/scripts/picky-eater.mjs`,
`skills/picky-eater/THIRD_PARTY_NOTICES.md`, `schemas/board.schema.json` and `docs/patterns.md`.
Change `src/` or `catalog/`, then run `npm run build`. CI fails if they are out of date
(`npm run check:bundle`).

## Coding standards

- TypeScript, strict mode, ESM. Prefer small modules with plain functions.
- **No runtime dependencies in the bundle** beyond what esbuild inlines today (zod). Anything
  that runs in users' projects must work with Node.js built-ins on Node 22.
- Test-only tools (Playwright, axe-core) are dev dependencies, never bundled.
- Treat mockup markup, repository content and browser input as untrusted. No `innerHTML` with
  board text, no shell strings, no paths from the browser. Read [SECURITY.md](SECURITY.md) before
  touching `src/server/`, `src/review/compose.ts` or `src/session/fs.ts`.
- **Nothing listens inside the mockup frame.** WebKit does not deliver events from a script-less
  sandboxed frame to listeners added from outside. The stage reads the frame once per animation
  frame and owns its hit targets. Keep it that way: the browser tests run in Chromium only and would
  not notice.
- Writes to `.picky-eater/` go through `writeJsonAtomic` and, for read-modify-write, `withLock`.
- User-facing text (CLI output, review page, docs) is English, plain and specific. The review
  page is for people who do not know design terms, and the options popover contains no text at all.

## Changing the board format

`board.json` carries `schemaVersion: "2.0"`. Adding an optional field is a minor change. Removing
or renaming fields, or tightening validation so that existing boards fail, is breaking: bump the
major version and fail with a clear message for older boards. Update
`skills/picky-eater/references/board.md` and the example board in the same pull request.

## Changing the catalog

Edit the JSON files under `catalog/` as described in [catalog/README.md](catalog/README.md) and run
`npm run build`. Every pattern needs a source and an example; mark an example `verified` only if
you opened its URL. If a pattern can be drawn, add a snippet for it in `src/kit/snippets.ts`
using kit classes from `src/kit/kit.css`. The unit tests check that snippets belong to catalog
patterns, pass the mockup checks and only use classes the kit defines.

## Changing the skill

`SKILL.md` must stay valid under the Agent Skills specification: only the six standard
frontmatter fields, `name` equal to the folder name, description of at most 1024 characters, body
well under 500 lines. Keep always-on rules at the top and move detail into `references/`. CI runs
the official `skills-ref validate`. Never add another `SKILL.md`, `.agents/skills` or
`.cursor/skills` folder anywhere in the repository (agents would discover them as extra skills).

## Testing expectations

- Every bug fix comes with a test that fails without the fix.
- Board rules and session rules (`src/core/`, `src/session/`): unit and integration tests.
- Server and CLI behavior: integration tests in `tests/integration/` (they run against a fresh
  test build of the CLI).
- Review page changes: Playwright tests in `tests/e2e/`, in Chromium, and
  screenshots in the pull request description for visible changes.
- Do not claim support for a framework, agent or OS that you have not tested; update
  [docs/compatibility.md](docs/compatibility.md) with what you verified and how.

## Pull requests

1. Fork and create a branch from `main`.
2. Keep pull requests focused; explain the user-visible change and why.
3. Run `npm run typecheck && npm test && npm run test:e2e && npm run check:bundle` locally.
4. Commit the regenerated bundle, notices, schema and `docs/patterns.md` if `src/`, `catalog/` or the
   zod version changed.
5. Update documentation in the same pull request when behavior changes.
6. A maintainer reviews; CI must be green before merge.

Use clear commit messages in the imperative mood ("Keep the scroll position when an option is previewed").

## Reporting issues

Open a GitHub issue with: what you asked the agent, which agent and version, the skill version
(`node <skill folder>/scripts/picky-eater.mjs --version`), OS and Node.js version, what happened, and
what you expected. Attach the output of `node <skill folder>/scripts/picky-eater.mjs status --json`
if relevant. **Remove anything private** — sessions may contain summaries of your code.

Feature requests are welcome; describe the page you were trying to build and where the storyboard
did not help.

## Security issues

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).

## Releasing (maintainers)

1. Update the version in `package.json`, `src/version.ts`, `skills/picky-eater/SKILL.md`
   (`metadata.version`) and `.claude-plugin/marketplace.json`.
2. `npm run build`, run all checks, commit.
3. Tag `vX.Y.Z` and create a GitHub release with notes.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
