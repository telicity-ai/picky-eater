# Stacks: picky-eater against real development servers

A board over an existing page has to work with whatever draws that page. This folder holds the
same small page ("Trailhead") written for 14 frameworks and development servers, one board over
it, and a runner that starts each development server and plays a person's visit to the review.

```sh
npm run test:stacks                         # every stack (about ten minutes, most of it installing)
npm run test:stacks -- vite-react next      # only these
npm run test:stacks -- --list               # names
npm run test:stacks -- --keep               # leave node_modules in the fixtures for the next run
npm run test:stacks -- --serve nuxt         # install one, start it and leave it running
```

It needs network access to install the packages of each fixture, and the Chromium of Playwright
(`npx playwright install chromium`). Each fixture pins the versions of what it names; its
`node_modules` are removed after its run unless `--keep` is given. Results are written to
`test-results/stack-logs/results.json`, with the versions that were installed and what the
running page said about itself. `docs/compatibility.md` records the last run.

This is not part of `npm test` or of the tests of every push. `.github/workflows/stacks.yml` runs
it once a week and on request.

## What is checked on every stack

`stack.spec.ts`, with the steps of a visit in `visit.ts`:

1. `validate` opens the running page: every anchor, every selector a patch needs and the steps of
   the cuts fit, the frameworks are recognised, and the top banner resolves to its component and
   source file where the stack can tell.
2. The real app runs inside the review, behind the stage listener.
3. Options of every kind are applied: a text, a class, attributes, a wrapper around an element, an
   element moved into another component, inserted markup, styles.
4. They stay while the framework redraws the page: new list items, a class the framework
   rewrites, a text it updates inside an element that was wrapped and moved, an element it removes
   and adds again while it is moved elsewhere, a field it controls inside a wrapper. The app keeps
   working throughout.
5. An edit of a source file arrives, as a hot update or a reload, and the options are there
   afterwards.
6. Nothing is reported as a problem on the page, and the console shows no error (a hydration
   mismatch would be one).
7. After approval, `implement` measures the approved look.

## The stacks

`stacks.mjs` lists them: how each development server is started, where the shared stylesheet
goes, and what the page should say about itself.

| Name | What it is |
|---|---|
| `vite-react`, `vite-vue`, `vite-svelte`, `vite-solid`, `vite-preact` | Client-rendered apps on Vite |
| `next` | Next.js, App Router: a server component with two client components, hydrated |
| `react-router` | React Router in framework mode, server-rendered and hydrated |
| `nuxt` | Nuxt, server-rendered and hydrated |
| `sveltekit` | SvelteKit, server-rendered and hydrated |
| `astro` | A static Astro page with two React islands |
| `angular` | Angular with `ng serve` |
| `webpack-react18` | webpack-dev-server, Babel and React 18 |
| `parcel-react`, `rsbuild-react` | React on Parcel and on Rsbuild |
| `react-app` | Not a fixture: `examples/react-app` with its own board, tested by `react-app.spec.ts` |

## Adding a stack

1. Write the page in `fixtures/<name>/`: the same elements, ids and classes as the other fixtures
   (`vite-react` is the plainest one to copy), the name of the stack in `#stack`, and an import of
   `trailhead.css` (the runner copies the shared stylesheet to the path named by `css`).
2. Pin the versions in its `package.json`. No lockfile.
3. Add an entry to `stacks.mjs`.
4. `npm run test:stacks -- <name> --keep` until it passes; `--serve <name>` to look at it.

The test that needs no framework at all is `tests/e2e/rerender.spec.ts`: a page that redraws
itself in the three ways frameworks do, run in Chromium with every push.
