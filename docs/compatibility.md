# Compatibility

What has been checked, how, and what has not. Nothing here is claimed without a test or a recorded
manual run.

## Runtime

| | Status |
|---|---|
| Node.js 22 and newer | Required. The CLI refuses older versions with a message. CI runs the tests on Node 22 and 24 |
| macOS | Developed and tested here |
| Linux | Tested in CI |
| Windows | Not tested |

The shipped CLI is one file and needs only Node.js built-ins.

## Browsers (the review page)

The browser tests in `tests/e2e/` run the whole flow in Chromium. New screens: sketch,
drawn options, live preview, scroll position, sticky header, cuts, form controls, phone width,
change request, approval, and a revision with hostile markup. Existing pages, with
`examples/static-site` behind the stage listener: the site's own scroll effect, sticky header,
form and hot-reload socket, patches of every level, cuts replayed by their steps, an app that
tries to choose, approve or navigate the review page, and `"attach": "tag"`. A page that redraws
itself the way frameworks do: patches stay, the page keeps working, and taking them off leaves it
as the page has it.

| Engine | Status |
|---|---|
| Chromium (Chrome, Edge) | Tested |
| Firefox | Not tested. Covered by the browser tests up to 0.2.0 |
| WebKit (Safari) | Not tested. Covered by the browser tests up to 0.2.0. WebKit does not deliver events from a script-less sandboxed frame to listeners added from outside, so the review page never listens inside the mockup |

## The headless browser (`inspect`, `validate`, `implement`, `check`)

| | Status |
|---|---|
| Google Chrome on macOS | Tested (`tests/integration/check.test.ts`) |
| Microsoft Edge, Chromium, Brave; Linux and Windows paths | Looked up in their usual places; not tested |
| A Chromium from Playwright's cache | Used when nothing else is installed, and its headless-only build when the installed browser cannot start (a sandboxed agent shell) |
| No such browser | The commands stop with a message. `PICKY_EATER_BROWSER=<path>` names one |
| Firefox, Safari | Not supported for these commands |

`inspect` and the page check of `validate` read the running page; `implement` and `check` measure
it. The comparison uses the layout engine of Chromium. A page that looks different only in
another engine is not caught.

## Coding agents

The skill follows the [Agent Skills](https://agentskills.io) format: one folder with `SKILL.md`,
references and a script. The install layout and metadata are unchanged from version 0.1.

### Installing

Each method of [installation.md](installation.md) was run against the public repository on
2026-11-21 (macOS, Node 22.18), into an empty project:

| Method | Result |
|---|---|
| `npx skills add telicity-ai/picky-eater --skill picky-eater -a claude-code codex cursor -y` (`skills` 1.5.18) | Created `.agents/skills/picky-eater/`, a link to it at `.claude/skills/picky-eater` and `skills-lock.json`. The CLI answers `--version` with 0.2.0 through both paths |
| Claude Code 2.1 plugin marketplace: `claude plugin marketplace add telicity-ai/picky-eater --scope project`, then `claude plugin install picky-eater@telicity-ai --scope project` | Listed as `picky-eater@telicity-ai`, version 0.2.0, enabled. 1.3 MB installed. The CLI of the installed copy answers with 0.2.0 |
| `git clone --depth 1` and a copy of `skills/picky-eater` into `.agents/skills/` and `.claude/skills/` | The CLI answers with 0.2.0 from both, and `new --from` the example board, `validate` and `propose` run |

These runs checked the files and the CLI. No agent was started from these installs.

Version 0.2 was run end to end on 2026-11-14 with each agent in non-interactive mode, on two
small projects: a new sign-up page for a static site, and changes to the home page of
`examples/static-site`. A script played the person: it opened the review link, picked the
suggested option of every area and pressed Approve; in one run it asked for a change first.

| Agent | New screen | Existing page |
|---|---|---|
| Claude Code 2.1 (`claude -p`) | Drew the board, answered a change request with a second draft, built the page after approval, fixed what the first `check` found, `check` passed, reported. 19 turns | Board of patches over the running page, built after approval, `check` passed at once, reported. 21 turns |
| OpenAI Codex CLI 0.168 (`codex exec`, workspace-write sandbox with network access) | Drew the board, built the page after approval, `check` passed, reported | Board of patches, built after approval, `check` passed, reported. `implement` and `check` were run for it from a normal terminal, because the browser could not start in its sandbox (see below) |
| Cursor | Not tested | Not tested |

With the framework support of milestone 5, Claude Code 2.1 was run once more on 2026-11-14, on a
copy of `examples/react-app` (Vite, React 19, TypeScript) with the request to make its settings
page easier to scan and to get "Delete account" away from "Save". It began with `inspect`, drew
a board of three areas over the running app (styles, inserted markup and a moved button),
`validate` held it against the running page without a warning, and after approval it changed the
React sources (a new section, a `danger` variant of the app's `Button`). The first `check` listed
four differences, the third none; the app's own type check and tests passed. 25 turns, 189
seconds. Codex was not run again for this milestone.

What these runs showed:

- **An older copy of the skill in your home folder wins in Claude Code.** A personal skill
  (`~/.claude/skills/picky-eater`) takes precedence over a project skill of the same name. With
  version 0.1 installed there, Claude Code followed the old instructions in a project that had 0.2.
  Update or remove the personal copy when you install a newer one in a project.
- **Codex's sandbox and the browser.** Inside Codex's default sandbox on macOS an installed Chrome
  cannot start. `implement` and `check` therefore fall back to starting the browser as a single
  process, and then to the headless-only Chromium that Playwright keeps in its cache, which does
  start there (verified with `codex sandbox`). Without such a build the commands stop with a
  message that says to run them outside the sandbox or to ask the user.
- **The preview in Codex.** With `sandbox_workspace_write.network_access=true` the review page
  started and was reachable. Without network access a sandboxed shell cannot listen on 127.0.0.1;
  the preview then fails to start with a message that says so. Allow it, or run
  `picky-eater preview --foreground` in your own terminal.
- Both agents first tried to keep the command in a shell variable, which zsh does not split.
  `SKILL.md` now says to write it out or to define a function.

## Frontend frameworks

**New screens** are drawn as static mockups, so the review does not depend on the framework of
the project. The agent implements the approved mockup in whatever the project uses.

**Existing pages** are shown running, so what draws the page matters. `tests/stacks` holds the
same small page written for each stack below, starts its real development server, publishes one
board over it and plays a person's visit to the review in a browser
([what is checked](../tests/stacks/README.md#what-is-checked-on-every-stack)). Last run:
2026-11-14, macOS, Node 26, Chromium. All of it passed on every stack.

| Stack | Versions | The page | Component and file of an area | An edit of a source file |
|---|---|---|---|---|
| Vite + React | Vite 8.3, React 19.3 | drawn in the browser | `<Hero> src/Hero.jsx` | hot update |
| Vite + Vue | Vite 8.3, Vue 3.5 | drawn in the browser | `<Hero> src/Hero.vue` | hot update |
| Vite + Svelte | Vite 8.3, Svelte 5.57 | drawn in the browser | `<Hero> src/Hero.svelte:1` (the line of the element) | hot update |
| Vite + Solid | Vite 8.3, Solid 1.9 | drawn in the browser | not known: Solid leaves nothing to read | hot update |
| Vite + Preact | Vite 8.3, Preact 11.2 | drawn in the browser | not known: Preact leaves nothing to read | hot update |
| Next.js, App Router, Turbopack | Next.js 16.4, React 19.3 | a server component and two client components, hydrated | `<Hero> app/Hero.jsx:1` (the name from the page, the file from the sources) | hot update |
| React Router, framework mode | React Router 8.5, React 19.3, Vite 8.3 | server-rendered, hydrated | `<Hero> app/Hero.jsx` | hot update |
| Nuxt | Nuxt 4.6, Vue 3.5 | server-rendered, hydrated | `<Hero> app/components/Hero.vue` | hot update |
| SvelteKit | SvelteKit 3.2, Svelte 5.57, Vite 8.3 | server-rendered, hydrated | `<Hero> src/lib/Hero.svelte:1` | hot update |
| Astro | Astro 7.4, React 19.3 islands | static markup with two hydrated islands | `<Hero> src/components/Hero.astro:1`; islands by their React component | reload |
| Angular | Angular 22.2 (`ng serve`) | drawn in the browser | `<Hero> src/app/hero.ts:13` (the name from the page, the file from the sources) | reload |
| webpack-dev-server + Babel | webpack 5.112, webpack-dev-server 6.1, React 18.3 | drawn in the browser | `<Hero> src/Hero.jsx:1` | reload |
| Parcel | Parcel 2.16, React 19.3 | drawn in the browser | `<Hero> src/Hero.jsx:1` (the file from the sources) | hot update |
| Rsbuild | Rsbuild 2.3, React 19.3 | drawn in the browser | `<Hero> src/Hero.jsx:1` (the file from the sources) | hot update |
| `examples/react-app` | Vite 8.3, React 19.3, TypeScript 7.0 | a settings form with a mock API | `<SettingsPage> src/pages/SettingsPage.tsx`, `<Button> src/components/Button.tsx`, … | hot update |

On each of them: patches of every kind (a text, a class, attributes, a wrapper, an element moved
into another component, inserted markup, styles) stay in place while the framework adds list
items, rewrites a class, updates a text inside a wrapped and moved element, removes and re-adds
an element that is moved elsewhere, and controls a field inside a wrapper; the app keeps
working; the console shows no error (on the server-rendered ones, no hydration mismatch); and
`implement` measures the approved look.

The same behavior is tested without any framework in `tests/e2e/rerender.spec.ts`, in Chromium: a
page that keeps references to its elements and changes them in the three
ways frameworks do (through the parent it remembers, through the parent the element has now,
through the element itself), including the removal of a run of sibling elements and a page that
undoes a patch a hundred times a second.

What these runs showed, and what was done about it:

- **Frameworks differ in how they reach their elements**, and a moved element meets each
  differently. React, Vue and Angular ask the parent they remember, which fails when the element
  is elsewhere. Solid and Preact ask the parent the element has now, and so adopted the patched
  place as their own: after a hot update of that place the element was gone. Svelte removes a run
  of siblings by walking from the first to the last, and went on past the end when the last one
  had been moved, taking everything that followed. The keeper now puts displaced elements back
  just before any of these happens ([concept.md](concept.md#pages-that-redraw-themselves)).
- **A hot update that replaces the place an element was moved to** (Svelte, Solid) took the moved
  element with it. Its old place is now marked, and it goes back there first.
- **Astro's development toolbar removes the source attributes** from the page as soon as it has
  loaded. They are read from the markup as it was served.
- **A server component's stack names the chunk the server ran** (Next.js), and Parcel and Rsbuild
  name their bundle. A file the project does not have is not taken for a source: the component's
  name is looked up in the sources instead.
- **Astro 7 puts its development server in the background** when it is not started from a
  terminal (`astro dev stop` ends it). This only matters to whoever starts it.
- **Nuxt's hot-update socket has a port of its own**, so it does not pass through the stage
  listener. Hot updates arrive all the same.

Not covered:

- **A sign-in that leaves this machine.** `picky-eater signin` signs the headless browser in with
  the project's development account, by steps on a local page or a local one-time link. A
  sign-in through an identity provider on another host cannot be played.
- **Web components with a shadow root.** Elements inside a shadow root cannot be anchored or
  patched.
- **Svelte and Lit: the first of several sibling elements that one block adds and removes
  together.** If a patch moves or wraps it, the rest of the block stays on the page when the
  block is removed, until a reload (seen with Svelte 5). The last one and those in the middle are
  handled.
- Vue 2, Qwik, Lit, Ember, Gatsby and Remix 2 were not run. The real frameworks were run in
  Chromium only.

## A real product: T3 Code

The stacks above run a small page. To see what a product screen does to the tool, it was run on
the web client of [T3 Code](https://github.com/pingdotgg/t3code) (`a7fd4326`, 2026-11-13): a
pnpm monorepo of 5 apps and 31 packages, React 19.3, TanStack Router, Tailwind 4, Base UI,
a virtualised message list, a rich-text composer, its server behind a WebSocket, and a pairing
screen in front of everything. The server and the Vite development server ran from a clone with
a data folder of their own; threads were made with the project's replay provider. Run on
2026-11-14, macOS, Node 26, Chromium; by hand first, then by Claude Code.

A board with five areas and two cuts: the thread rows of the sidebar, the controls under the
message box, the top bar, the buttons under an answer, and the navigation of the settings dialog
(a cut reached by a click).

| What was done | Result |
|---|---|
| `inspect`, `validate` on the thread page | After `signin` with a pairing link: a map of 45 parts with selectors such as `[data-chat-header]` and `[data-chat-composer-footer]`, each with its component and file (`<SidebarThreadRow> apps/web/src/components/sidebar/SidebarThreadRow.tsx:645`). `validate` found every anchor, every patch target and the cut behind the click |
| The review, in a browser that had never seen the app | The pairing screen, with the note "Sign in, in the preview"; after pairing inside the preview, the page with its four areas |
| Options of every kind on the running app | `css` (rows of two lines), `set` on every row, `move` of the model picker (a Base UI popover trigger: it still opens), `insert` of a button and of words into icon buttons, `wrap`, `each` (the title line first and a chip in every row). All held while rows were hovered, the picker was opened, and another thread was opened through the app's own router |
| A thread that arrives while the review is open | The new row got the same operations as the others |
| A cut inside a dialog | The settings dialog is drawn outside the app's root by a route. Its steps opened it, its area got its dot, and going back to the first cut closed it |
| `implement` | Measured the approved page signed in: 2 widths × 2 moments in 18 seconds |
| Claude Code, from the request to the report | Signed the headless browser in by itself with the pairing command it was given, mapped the page with `inspect --within`, drew two areas (its suggested option for the rows uses `each`), waited; after approval changed `SidebarThreadRow.tsx` (70 lines) and `ChatComposer.tsx` (1 line); the first `check` found 9 separators it had added, which it took out again. 36 turns, 6 minutes, $1.73 |
| The comparison of that build | Looks the same as the approved page. `check` first listed 7 differences that were none (the relative times had moved from "36m" to "38m"; one icon was numbered by its place in the markup); with times paired as times and numbering in reading order it reports "matches", and names the one line that differs when one of the two changes is taken out again |

What it changed in the tool, each with a test that needs no T3 Code
(`tests/integration/signin.test.ts`, `tests/e2e/signin.spec.ts`, `tests/e2e/rerender.spec.ts`):

- `signin`, and the review's note and way back, for pages behind a sign-in.
- `set`, `wrap`, `move` follow a list that grows, and `each` works inside every item.
- `inspect` prefers names to styling classes, goes closer with `--within`, and follows `--steps`.
- Sources are found in a repository of several packages, and the component named is the
  project's, not the library's.
- Steps wait for a screen that is drawn late; a cut is reached when its mark is on the page.
- The comparison numbers things in the order they are read and pairs times as times.

Not run: a second product on another framework. The machine these runs were made on had no room
left for one. Real apps on Vue, Svelte and Angular are covered only by the small page above.

## Development servers (existing pages)

The stage listener sits in front of the development server. What it does is tested against
stand-in servers in `tests/integration/stage-proxy.test.ts`, against
`examples/static-site/server.mjs`, and against the real development servers of the table above:
Vite 8, Next.js 16 (Turbopack), webpack-dev-server 6, Parcel 2, Rsbuild 2, Nuxt 4, Astro 7,
`ng serve` 22 and React Router 8. None of them needed `"attach": "tag"`.

| Concern | Handling | Checked |
|---|---|---|
| Hot-reload WebSocket | The upgrade is piped through with the development server's own `Host` and `Origin` | Test with a hand-written WebSocket server; hot updates arrive on every stack of the table |
| Host and origin checks | Requests reach the development server with its own `Host`, `Origin` and `Referer` | Test; Vite, Next.js and webpack-dev-server accept them |
| Streamed and compressed HTML | The page is read to its end, unpacked (gzip, deflate, Brotli) and sent with the script tag added | Test (gzip); Next.js and React Router stream their pages |
| Cookies | `Domain` is removed from `Set-Cookie` | Test |
| `Content-Security-Policy`, `X-Frame-Options` | Framing is allowed for the review page only; the injected script is allowed by nonce if the policy uses one, otherwise by its address; a policy in a `<meta>` element is adjusted as well | Test |
| Service workers | Off by default; `"serviceWorker": "allow"` | Test |
| Absolute addresses | `Location` headers and addresses of the development server in HTML are rewritten | Test |
| An app that does not work behind another address | `"attach": "tag"` with `picky-eater attach` / `detach` | Test |

Known gaps: HTTPS development servers are not supported (`base.url` must be `http://` on
loopback).
