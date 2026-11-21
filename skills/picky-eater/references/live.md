# Writing a board over a page that exists

When the page is already there, the user looks at **their real page**, running on their own
development server, with dots on top. Nothing is redrawn. Each option is a **patch**: the smallest
change to the running page that shows the option. The board is one file, `board.json`.

```
pe new --title "Pricing page" --url http://localhost:5173/pricing
```

The user's development server must be running while they review. Do not start, stop or
reconfigure it unless they ask.

## board.json

```json
{
  "schema": "picky-eater/board",
  "schemaVersion": "2.0",
  "title": "Pricing page",
  "base": { "kind": "live", "url": "http://localhost:5173/pricing" },
  "areas": [
    {
      "id": "plans",
      "label": "Plan cards",
      "anchor": "#plans",
      "source": { "file": "src/pages/pricing.html", "selector": "#plans" },
      "options": [
        { "id": "keep", "label": "Three equal cards", "keep": true },
        { "id": "featured", "label": "The middle plan stands out", "pattern": "pricing-table", "suggested": true,
          "patch": [{ "css": "#plans .plan--pro{transform:translateY(-8px);box-shadow:0 10px 30px rgba(0,0,0,.14)}" }],
          "build": "styles.css: raise .plan--pro by 8px and give it a shadow." },
        { "id": "pro-first", "label": "The middle plan comes first",
          "patch": [{ "move": ".plan--pro", "before": ".plan--basic" }],
          "build": "Put the Pro card before the Basic card in the markup." }
      ]
    }
  ],
  "cuts": [
    { "id": "top", "label": "Top" },
    { "id": "plans", "label": "Plans in view", "sameAs": "top", "at": "#plans" },
    { "id": "error", "label": "Sent blank: error", "at": "#signup",
      "steps": [{ "scroll": "#signup" }, { "click": "#signup button[type=submit]" }], "seen": ".form-error" }
  ]
}
```

| Field | Meaning |
|---|---|
| `base.url` | The page on the user's development server: `http://localhost:<port>/…` or `http://127.0.0.1:<port>/…`. Nothing else is accepted. |
| `areas[].anchor` | A selector for the element this area covers. Its box gets the dot and, while undecided, a dashed frame. |
| `areas[].source` | Where the area lives in the code: `file` (relative to the project) and `selector`, or `component` and `line` in a framework app. This is where you will make the change after approval. |
| `areas[].cuts` | The area only exists in these cuts (an error message). Its dot appears there. |
| `areas[].when` | The area only exists while another area has one of these options: `{ "plans": ["featured"] }`. |
| `options[].keep` | `true` on exactly one option per area: the page as it is now. The user can always leave an area unchanged. |
| `options[].patch` | What changes, as a list of operations (below). |
| `options[].page` | `true` if the patch touches elements outside the anchor: a bar at the top of the page, moving the anchor itself. |
| `options[].focus` | The part that changes, when it is smaller than the area or lies outside it. Thumbnails are cropped to it, and the page scrolls to it on preview. Needed when a patch hides the anchor. |
| `options[].build` | What to change in the source if this option is approved. Write it now, while you know. |

`label`, `pattern`, `suggested`, `because`, `viewports`, and `decision` and `rejected` of an area
work as on a new screen ([board.md](board.md)).

## Patch operations

Use the lowest level that shows the option. Each level keeps a little less of the real page.

| Level | Operation | Example | What survives |
|---|---|---|---|
| 1 | `css` | `{ "css": ".plans{gap:32px}" }` | Everything. The rules are added in their own stylesheet. |
| 2 | `move` | `{ "move": ".plan--pro", "before": ".plan--basic" }` | The elements themselves, with their listeners and observers. |
| 2 | `wrap` | `{ "wrap": ".price", "in": "<div class=\"price-row\"></div>" }` | Same. |
| 2 | `set` | `{ "set": ".cta", "text": "Start free", "attr": { "href": "#signup" }, "addClass": ["big"], "removeClass": ["ghost"] }` | Same. `text` replaces the element's content. |
| 3 | `insert` | `{ "insert": "<p class=\"note\">Cancel any time.</p>", "after": ".cta" }` | Existing elements. The new markup has no behavior. |
| 2–3 | `each` | `{ "each": ".thread-row", "patch": [{ "move": ".title", "before": ".project" }, { "insert": "<span class=\"chip\">PR</span>", "into": ".meta" }] }` | As the operations inside it. |
| 4 | `script` | `{ "script": "this.on = () => …; area.addEventListener('click', this.on)", "undo": "area.removeEventListener('click', this.on)" }` | Depends on the script. Shown to the user as **Approximate**. |

- `move` and `insert` say where with exactly one of `before`, `after`, `into`, `atStartOf`.
- **Lists** (rows, cards, table rows, menu items). `set` and `wrap` change every element their selector finds. `move` gathers everything it finds at **one** place, and `insert` adds its markup **once**. To do something in every item, use `each`: its selector finds the items, and the operations inside it (`move`, `wrap`, `set`, `insert`) are looked up inside each item (`:scope > …` is the item itself). Items that arrive later, or that the app draws anew, get the same operations; an item of another kind in the same list (a heading, a divider) is left as it is.
- Selectors are looked up **inside the anchor** (the anchor itself counts). With `"page": true` they are looked up in the whole page.
- Every operation is undone when a preview ends, so write selectors that match the page **before** the patch. A later operation of the same patch may name what an earlier one added (`insert` a box, then `move` something `into` it).
- Write `css` selectors that only reach this area (`#plans .plan`), so that areas stay independent.
- Inserted markup cannot contain scripts, event handlers, frames or anything loaded from another site. It may use the app's own images and link to its own pages.
- A `script` is the last resort: only for behavior that `css`, `move`, `wrap`, `set` and `insert` cannot show (a control that switches something). It runs with `area` (the anchor element) and `document`; `this` is shared with its `undo`, which must take back everything. It cannot load, send or store anything (`fetch`, `location`, storage and cookies are refused), and thumbnails do not show its effect.
- A section that does not exist yet: anchor the area on a neighbor that does, and `insert` the section `after` it with `"page": true` and a `focus` on the new section.

## Cuts

| Field | Meaning |
|---|---|
| `at` | Scroll so that this element is at the top of the screen. |
| `sameAs` | The same page state as another cut, at another scroll position (needs `at`). |
| `steps` | What a person does to get from the freshly opened page to this moment: `{ "scroll": sel }`, `{ "click": sel }`, `{ "fill": sel, "value": "…" }`, `{ "wait": sel }`, `{ "hover": sel }` (opens what the page opens by script when the pointer arrives; a style on `:hover` needs a real pointer), `{ "key": "Escape", "on": sel }` (a shortcut, an arrow key). |
| `seen` | An element that is visible only in this state. The review uses it to follow the user when they act in the page themselves. |

The first cut is the page as it opens. Every other cut with its own state needs `steps`; going to
it reloads the page and replays them, so they must work from a fresh page. Give it `seen` too.

## Looking at the running page

Do this before you write a selector, and again when one does not match.

```
pe inspect                          # a map of the page of this session
pe inspect --url http://localhost:5173/pricing
pe inspect "#plans" ".plan .cta"    # what these selectors find
```

```
http://localhost:5173/pricing — React 19.1.0, Vite 7.0.0
.pricing  "Simple pricing"  1040×1200 at 120,62  <PricingPage> src/pages/PricingPage.tsx
  #plans  "Plans"  1040×420 at 120,180  <PlanGrid> src/components/PlanGrid.tsx
    [class*="PlanCard_card__"] (3 matches; the first)  "Basic"  320×380 at 120,220  <PlanCard> src/components/PlanCard.tsx
```

Each line is a part of the page: a selector that finds it, its first words, its size and place,
and the component and file that draw it. Use the selector as the `anchor` and the file and
component as the `source`. Then read that file; do not read the whole project to find it.

An app screen is denser than a page of sections. Go closer where you need to:

```
pe inspect --within "[data-slot=sidebar]"              # one part, down to its buttons and fields
pe inspect --steps '[{"click":"button[aria-label=Settings]"}]'   # after these actions
```

What lies over the page after the steps (a dialog, a menu, a popover) is listed first; the same
`steps` then reach that moment as a cut. Selectors prefer what the authors named: ids, test ids,
`data-*` attributes, labels. Classes that only style (`flex`, `mt-4`) are not used.

### Pages behind a sign-in

The page is opened in a browser of picky-eater's own, which starts signed out. If the page needs
a sign-in, `inspect` and `validate` say that they see a sign-in screen. Sign that browser in once:

```
pe signin --url http://localhost:3000/login --steps '[{"fill":"#email","value":"dev@example.com"},{"fill":"#password","value":"…"},{"click":"button[type=submit]"}]'
pe signin --url "http://localhost:5733/pair#token=…"     # a one-time link the project's tooling prints
pe signin            # is a session saved?      pe signin --clear   # forget it
```

It opens the address, plays the steps, and keeps the cookies and local storage the browser ends
up with for `inspect`, `validate`, `implement` and `check`. They stay in `.picky-eater/runtime/`,
which is never committed. Use the project's development account only (seed data, README,
`.env.example`). The user's own browser is not involved: in the review they sign in themselves,
inside the preview, and the page of the board opens afterwards.

## Apps that redraw themselves (React, Vue, Svelte, Solid, Angular, …)

The same board works; these are the things to know.

- **Selectors.** Use ids, `data-testid`, `data-*` attributes and class names a person wrote. Class names with a hash
  (`Hero_title__x7Kp2`, `css-1q2w3e`) change when the file changes: `inspect` offers
  `[class*="Hero_title__"]` instead. Ids such as `:r1:` are made up at run time; never use them.
- **Patches hold.** When the app redraws a part, picky-eater puts the patch back before the next
  paint, and lets the app through when it wants to remove or reorder an element a patch has moved.
  When a list gets a new row, `set`, `wrap` and `each` reach it too.
  `css` is never affected. Prefer `css` to `move` where both can show the option (`order`, grid
  placement): it does not touch what the framework owns.
- **Svelte and Lit:** do not `move` or `wrap` the first of several sibling elements that one
  `{#if}` or `{#each}` block adds and removes together; the rest of the block would stay behind
  when the block goes. Restyle with `css`, or patch the last one or one in the middle.
- **Do not `set` the `text` of something the app keeps updating** (a counter, a clock, a price that
  changes with a switch): the patch would hide the live value. Patch what is around it. An option
  that the page undoes many times a second is taken off and reported as "the page keeps undoing
  the patch".
- **Pages that are sent from the server and then taken over** (Next.js, Nuxt, SvelteKit, Astro,
  React Router): patches wait until the framework has taken the page over, so they never cause a
  mismatch between the server's markup and the client's.
- **`source`** is the component file: `{ "file": "src/components/PlanGrid.tsx", "component": "PlanGrid" }`.
  `validate` says which component draws each anchor and warns when the board names another one.
- **Web components with a shadow root**: elements inside the shadow root cannot be anchored or
  patched. Anchor the component's own element and patch it with `css` custom properties or
  attributes it documents.

## What the page is like, and what to offer on it

```
pe inspect --profile     # the kind of page, what moves on it today, the timing its authors named, the moments where something changes
pe recommend             # those moments as decisions: what to offer at each, what to leave out and why, what the person chose before
pe recommend --frequency frequent     # if the page is met more or less often than it looks: constant, frequent, occasional, rare
```

```
http://localhost:4062/ — a page that is read, met rarely (rare; say otherwise with --frequency)
Moves today: 0 element(s) with a transition, 0 animation(s); no rule for reduced motion; no motion library

1. a press · .button (2 on the page) · "Install with Homebrew" · today: nothing answers a press
   decision: press-feedback — Answer a press on a button · met rarely
   offer  instant-change — The control is pressed many times in a row, or its color already changes on press
   offer  press-scale — The press has no visible answer and the control is a button, card or tile
   leave out  hold-to-confirm — …
   earlier choices speak for instant-change: In this project you chose no motion over subtle motion.
```

Each numbered block becomes an area: `"decision"` is the id it names, each `offer` line an option
with that `"pattern"`, each `leave out` line an entry of `"rejected"`. What it lists under "Over the
cap" and "Already answered" is not offered. `pe recommend` applies the first three of the
[four questions](patterns.md#motion) by rule; the fourth (does it get in the way here?) is yours.

## What `pe validate` checks

The structure, the safety of every patch, the `when` graph and that `source` files exist. Then it
opens the running page and holds the board against it: every `anchor`, every selector a patch
needs, the `steps`, `at` and `seen` of every cut, and the component each area belongs to. What
does not fit is a warning that starts with `PAGE_`:

```
warning PAGE_TARGET [area plans]: Area "plans", option "pro-first": ".plan--pro" matches nothing inside the anchor on the running page.
```

A motion that breaks the floor is a warning too, per option:

| Warning | Meaning |
|---|---|
| `MOTION_NO_REDUCED` | Something moves, grows or turns and the option has no rule for `prefers-reduced-motion`. |
| `MOTION_LAYOUT` | `width`, `height`, `top`, `margin` and the like are animated; move with `transform` instead. |
| `MOTION_ALL` | `transition: all`, or a transition that names no property. |
| `MOTION_SLOW` | Longer than the option's pattern allows. |
| `MOTION_ENDLESS` | Runs by itself for more than five seconds and nothing pauses it. |

Fix every one of them. `PAGE_SIGNIN` means the check saw a sign-in screen: run `pe signin` first
(`pe validate --no-page` skips the page). The review page reports the same when the user opens it, and
`pe status` (and `pe wait`) then print lines such as

```
Problem on the page: plans/pro-first: a selector of the patch matches nothing inside the anchor (.plan--pro)
```

Fix the draft and `pe propose` again.

## When the page does not work behind the preview

The app is normally shown through a local address of its own (the preview forwards to the
development server and adds one script to each page). If the app breaks there, for example
because its API only accepts requests from the development server's own address:

```json
"base": { "kind": "live", "url": "http://localhost:5173/pricing", "attach": "tag" }
```

```
pe attach --file index.html     # adds one marked <script> tag to the development HTML entry
…review…
pe detach                       # removes it; do this before you finish, and never commit the tag
```

This is the only change to project files that is allowed before approval, and only these two
commands make it. If the app registers a service worker that it needs in development (to mock an
API), add `"serviceWorker": "allow"` to `base`; by default service workers are off in the preview.

## Before `pe propose`

- Every area has one `keep` option and one to three patches that look different at a glance.
- The suggested option says why (`because`), and an area that answers a catalog decision names it (`decision`).
- Every patch uses the lowest level that works, and every non-`keep` option has a `build` note.
- Every area has a `source`.
- Each cut shows something the user needs to decide or check, and its `steps` work from a fresh page.
