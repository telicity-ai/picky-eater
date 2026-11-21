# picky-eater 2: the web page storyboard

Status: confirmed on 2026-11-13. Every milestone is built; the [milestone table](#milestones)
says what each one covers and how it was checked.

A manga artist draws a rough storyboard (a *conti*), decides how each panel is staged, and the
page turns into a finished manuscript panel by panel. picky-eater builds web pages the same way:

1. The coding agent draws a **rough storyboard** of the page, once.
2. A person **picks an option for each area**. The rough page turns into a finished mockup.
3. The person approves. The approved mockup is the **answer key** for the real implementation.

## Contents

1. [Vocabulary](#vocabulary)
2. [The review screen](#the-review-screen)
3. [Two starting points](#two-starting-points)
4. [Cuts](#cuts)
5. [Data model](#data-model)
6. [Architecture](#architecture)
7. [Security model](#security-model)
8. [Where the tokens go](#where-the-tokens-go)
9. [Pattern catalog](#pattern-catalog)
10. [Agent workflow and CLI](#agent-workflow-and-cli)
11. [Milestones](#milestones)
12. [Repository plan](#repository-plan)
13. [Risks and decisions](#risks-and-decisions)

## Vocabulary

| Term | Meaning | In the review screen |
|---|---|---|
| **Board** | The storyboard of one page: areas, options and cuts. One `board.json`. | The whole screen |
| **Area** | A part of the page that has a choice to make | A dot on the page, a cell on the sheet |
| **Option** | One way to draw an area: an HTML fragment or a patch | A rendered thumbnail |
| **Patch** | An option for an existing page: the smallest change to the live page | — |
| **Cut** | One moment of the page: a scroll position or an interaction state | A frame in the cut strip |
| **Sketch / chosen** | The two states of an area | Grey and dashed / finished design |
| **Stage** | The frame that shows the page at real viewport height | The centre of the screen |
| **Sheet** | A miniature of the whole page, one cell per area | The left rail |

The user-facing text never uses these words except "area". It is written for people who do not
know design terms.

## The review screen

The structure of the screen is the concept. There is no explanatory text.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Workshop sign-up · Draft 2   [Desktop│Phone]    ▰▰▰▱▱ 3 of 5 chosen   [History] [Ask for a change] [Approve] │
├──────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ SHEET    │ STAGE                                                                               │
│ ┌──────┐ │ ┌──────────────────────────────────────────────────────────┐                        │
│ │▓ nav │ │ │ Logo      Schedule   Speakers   [Sign up]       (chosen) │                        │
│ ├──────┤ │ ├──────────────────────────────────────────────────────────┤  ┌────────┐ ┌────────┐ │
│ │░ hero│ │ │ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  ◉─┼──│ option │ │ option │ │
│ ├──┬───┤ │ │   ▒▒▒▒▒▒▒▒▒▒▒▒   "Learn to ship in a day"    (sketch)   │  │ drawn  │ │ drawn  │ │
│ │▓▓│░░░│ │ │ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │  └────────┘ └────────┘ │
│ ├──┴───┤ │ │ ...the page scrolls inside this frame...                 │                        │
│ │░ form│ │ └──────────────────────────────────────────────────────────┘                        │
│ └──────┘ │                                                                                     │
├──────────┴─────────────────────────────────────────────────────────────────────────────────────┤
│ CUTS  [1 Top]─[2 Scrolled]─[3 Empty form]─[4 Sent blank: error]─[5 Filled in]─[6 Sent]          │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Stage.** The page is shown in a frame whose height is the real viewport height, and the page
scrolls *inside* it. Sticky headers, fixed bars and scroll effects therefore behave as they will
in the product. The frame is 1280 px wide for Desktop and 390 px for Phone. Controls inside the
page work: typing, ticking, opening a menu, pressing a button that leads to the next cut.

**Dots.** Every area that still needs a choice has a dot. Pointing at a dot opens its options on
a side with room: beside the frame when the page is narrow (phone width), otherwise just above the
dot, or below the area. The popover never covers the dot, and it is placed where it hides the
least of the area being decided. The options are small renderings of the real result, cropped to
the part that changes. There is no title, question or hint in that popover, only the options.
An option that the agent suggests carries a small mark. Pointing at that mark shows why it is
suggested and what was considered and left out; an option that moves carries a small play mark.

**Live preview.** Pointing at an option applies it to the page immediately. If the changed part
is outside the visible part of the stage, the stage scrolls to it first. Moving away restores the
previous state. Clicking keeps the option. The scroll position is preserved across previews and
choices: the area stays where it was on screen even if content above it changes height.

**Progress is visible in three places at once.**

- On the stage, a chosen area changes from sketch (grey blocks, dashed frame) to finished design.
- On the sheet, the matching cell changes from hatched grey to a miniature of the finished area.
  Clicking a cell scrolls the stage to that area. The sheet is also the keyboard path: every cell
  is a button that opens the same options.
- In the top bar, the counter fills up. **Approve** becomes available when every area is chosen.

**Cut strip.** See [Cuts](#cuts).

**Top bar.** One line at 1440 px: title and draft number, Desktop/Phone, on a board that offers
motion Replay/Slow/Reduced ([recommendation.md](recommendation.md#in-the-review)), progress,
History, Ask for a change, Approve. After approval the same place shows the state of the work: Approved →
Being built → Checked against the approved mockup.

**Side panel.** History (drafts, what changed since the last approval) and Ask for a change open
in a panel on the right. Its header with the Close button stays fixed at the top of the panel.

## Two starting points

Both are storyboards. They differ in what is underneath the dots.

### A. New screen: `sketch` boards

The page does not exist yet. The agent writes a page frame, a rough sketch of each area and a few
HTML fragments per area. The stage starts as a grey storyboard and is filled in area by area.

- The sketch of an area uses a small built-in sketch kit (`pe-block`, `pe-line`, `pe-image`,
  `pe-button`) plus the key copy, so it costs a few lines.
- The mockup is rendered in a **sandbox that cannot run scripts**. The review screen reads the
  mockup from outside and owns everything interactive (see [Stage drivers](#stage-drivers)).

### B. Existing product: `live` boards

The user's real page is shown, served by their own dev server: real CSS, real scripts, scroll
effects, sticky elements, working forms. Dots sit on top of it.

- Every area starts as "as it is now". Its options are **patches** to the live page. "Keep as it
  is" is always one of the options (`"keep": true`, exactly one per area).
- Unchanged parts are the real page. Only an area that is being decided is marked like a
  storyboard panel (dashed frame and dot) and only the chosen patch is laid over it.
- A section that does not exist yet is an area anchored on a neighbor, with an option that
  inserts the section next to it.

## Cuts

A cut is one moment of the page, like one panel in a sequence:

- a **scroll position** ("Top", "Header shrinks", "Pricing pinned"), or
- an **interaction state** ("Empty form" → "Sent blank: error" → "Filled in" → "Sent").

The strip at the bottom shows the cuts in order. Each frame is a small rendering of that moment.
Choosing a cut moves the stage to it. Acting inside the page (pressing Submit with empty fields)
moves to the matching cut as well, and scrolling highlights the scroll cut that is in view.

An area can be limited to certain cuts (an error message style only exists in the error cut).
Its dot appears only there, and the sheet shows which cut it belongs to.

| | `sketch` board | `live` board |
|---|---|---|
| How a cut is reached | Declared state: the page root gets `data-pe-cut="<id>"`; fragments show or hide parts with `data-pe-in="error sent"` and `data-pe-not`; `fill` sets form values | A short list of user actions replayed on the real page: `fill`, `click`, `scroll`, `wait` |
| Moving by acting in the page | `data-pe-go="sent"` on a control, optionally `data-pe-go-invalid="error"`, which uses the browser's own form validation | The real app changes state; a cut declares how to recognise it (`seen: ".form-error"`) |
| Going back | Set the state | Reload and replay the steps of the earlier cut. Every move to another page state starts from a freshly opened page |
| Scroll state | Root gets `data-pe-scroll="top"` or `"scrolled"` | The app's own scroll handling |

The same cut definitions drive the review screen and the automatic comparison after
implementation, so "the same cut" means the same thing in both.

## Data model

Everything the agent writes is one board per page, written **once** per draft.

```jsonc
// draft/board.json for a new screen
{
  "schema": "picky-eater/board",
  "schemaVersion": "2.0",
  "title": "Workshop sign-up",
  "base": { "kind": "sketch", "frame": "frame.html", "styles": ["styles.css"] },
  "viewports": [{ "id": "desktop", "width": 1280, "height": 800 }, { "id": "phone", "width": 390, "height": 760 }],
  "areas": [
    {
      "id": "hero",
      "label": "Top banner",
      "sketch": "areas/hero/sketch.html",
      "options": [
        { "id": "split", "label": "Text left, picture right", "html": "areas/hero/split.html",
          "pattern": "hero-split", "suggested": true,
          "build": "Two columns from 860px up; stacks on phones." },
        { "id": "centered", "label": "Centered text", "html": "areas/hero/centered.html", "pattern": "hero-centered" }
      ]
    },
    { "id": "form-error", "label": "Error message", "cuts": ["error"], "options": [ /* … */ ] }
  ],
  "cuts": [
    { "id": "top", "label": "Top" },
    { "id": "scrolled", "label": "Scrolled", "sameAs": "top", "at": "#schedule" },
    { "id": "error", "label": "Sent blank: error", "at": "#signup" },
    { "id": "sent", "label": "Sent", "at": "#signup", "fill": { "#email": "mina@example.com" } }
  ]
}
```

`frame.html` is the page skeleton. It marks where each area goes with `data-pe-area="hero"`.
Options are fragments that use the classes of the shared `styles.css`. An option may contain the
slot of another area; that area then exists only while the option is chosen. The full format is
in [skills/picky-eater/references/board.md](../skills/picky-eater/references/board.md).

```jsonc
// draft/board.json for an existing page: only the parts that differ
{
  "base": { "kind": "live", "url": "http://localhost:5173/pricing", "attach": "proxy" },
  "areas": [
    {
      "id": "plans",
      "label": "Plan cards",
      "anchor": "section.plans",
      "source": { "file": "src/pages/pricing.html", "selector": "section.plans" },
      "options": [
        { "id": "keep", "label": "As it is now", "keep": true },
        { "id": "three-up", "label": "Three cards side by side",
          "patch": [
            { "css": ".plans{grid-template-columns:repeat(3,1fr)} .plan--pro{transform:scale(1.04)}" },
            { "move": ".plan--pro", "before": ".plan--team" }
          ] },
        { "id": "toggle", "label": "Monthly / yearly switch",
          "patch": [
            { "insert": "<div class=\"pe-switch\">…</div>", "before": ".plans .plan:first-child" },
            { "script": "…", "undo": "…" }
          ] }
      ]
    }
  ],
  "cuts": [
    { "id": "top", "label": "Top" },
    { "id": "error", "label": "Sent blank: error", "steps": [{ "scroll": "#signup" }, { "click": "#signup button" }], "seen": ".form-error" }
  ]
}
```

### Patch operations

A patch is an ordered list of operations. The agent uses the lowest level that works, because
each level loses a little more of the real page's behavior.

| Level | Operation | What survives | Shown as |
|---|---|---|---|
| ① | `css` — rules added in a separate stylesheet | Everything | — |
| ② | `move`, `wrap`, `set` (text, attributes, classes) on **existing** elements | The elements themselves, so their listeners and observers | — |
| ③ | `insert` — new markup | Existing elements; the new markup has no behavior | — |
| ②–③ | `each` — the operations above, in every item of a list | As those operations | — |
| ④ | `script` — a short script, with an `undo` | Depends on the script | "Approximate" on the option and on the dot |

Rules:

- Selectors are looked up inside the area's `anchor`, unless the option is declared
  `"page": true` (a bar across the page, for example). This keeps areas independent. The patch
  engine enforces it when it applies a patch.
- Every operation is reversible. Preview on hover applies it and moving away undoes it. Undoing
  takes back only what is still the patch's own: a text, attribute or class the page has written
  since is the page's, and an element the page replaced is not put back.
- A later operation may name what an earlier one of the same patch added (`insert` a section,
  then `move` a button `into` it).
- An app screen is mostly lists. `set` and `wrap` change every element their selector finds;
  `move` gathers what it finds in one place and `insert` adds its markup once. `each` names the
  items (rows, cards, cells) and does its operations inside every one of them, with their
  selectors looked up in that item. An item of another kind in the same list (a heading, a
  divider) is left alone. Rows that arrive later get the same: see the next section.
- The page may redraw itself at any time. Each operation knows whether its effect is still there;
  see [Pages that redraw themselves](#pages-that-redraw-themselves).
- A patch is applied as a whole. While an element it needs is not on the page (an error message
  that only exists in another cut), only its `css` is in place; the rest follows when the element
  appears.
- `script` is limited in size, must come with `undo`, and may not name anything that loads, sends
  or stores. It is served to the app as a script file by the stage listener, so the app's
  Content-Security-Policy need not allow `eval`.
- `validate` checks all of this without a browser, and then opens the running page in a headless
  one and holds the board against it: every anchor, every selector a patch needs, the steps and
  marks of every cut. What does not fit is a `PAGE_` warning, not an error: that browser is not
  the person's, and the page may look different in theirs. A page behind a sign-in shows that
  browser its sign-in screen, which is said as `PAGE_SIGNIN`; see
  [Pages behind a sign-in](#pages-behind-a-sign-in). The review page reports what it cannot find
  from the person's own browser, and `status` and `wait` print it as "Problem on the page".

### Combinations are a graph, resolved in the browser

An area can exist only under certain choices of another area: on a sketch board because its slot
is inside an option, on a live board through `when`. Areas and options therefore form a directed
acyclic graph, and the person's choices are one path through it. The browser composes that path
from the pre-written pieces. The agent is not called while the person chooses. `validate` checks
that the graph has no cycle and that every area has a place.

### Tracing an area back to source

| Page type | `source` | Checked |
|---|---|---|
| Static HTML | `file` + `selector` or a `data-*` attribute | The selector matches in that file and on the live page |
| Framework app (dev build) | `file` + `component` (+ `line`) | The component that draws the anchor element on the running page is the named one |

A running page in development knows which component wrote each element, and `src/stage/framework.ts`
reads it: the owner and creation stack that React keeps on its fibers (the file and line of the
element itself up to React 18), `__file` of the component in Vue, `__svelte_meta` in Svelte, the
source attributes Astro writes into its markup (read from the markup as it was served, because
Astro's toolbar removes them from the page), `ng.getOwningComponent` in Angular, and the
attributes of the usual "click to source" build plugins. Where a page only knows a component's
name (Angular, bundlers that do not name files), the name is looked up in the project's sources;
a file that a development server names from its own root is looked up in every package of the
repository.
None of this is a public interface of those frameworks; every read is guarded and "unknown" is a
valid answer (Solid and Preact leave nothing to read).

It is used in three places: `picky-eater inspect` prints a map of the running page with a
selector, component and file for each part, so that the agent finds the right file without
reading the project; `validate` names the component of each area and warns when the board names
another; and `implement` records it with the answer key and prints it in the brief.

### Session files

All state is plain files in the user's repository.

```
.picky-eater/
  config.json
  sessions/<id>/
    session.json               title, kind, page, current draft, phase
    draft/                     written by the agent; mutable
      board.json  frame.html  styles.css  areas/<area>/<option>.html
    revisions/r1/              frozen by `propose`; never edited
      board.json  …            copy of the draft
      manifest.json            file hashes, digest, source fingerprints, changes since r0
      advice.json              where the person's earlier choices moved the suggested mark; not part of the digest
    choices.json               the person's picks for the current revision
    requests.json              change requests: area, cut, text, open / answered
    approvals/r2-a1.json       digest, frozen choices, differences from the previous approval
    answer-key/r2-a1/          measured from the approved mockup before building
    checks/c1/                 result of each comparison
    report.json                the agent's implementation report
    events.jsonl               append-only history
  runtime/                     git-ignored: tokens, ports, process ids
```

Screenshots under `answer-key/` and `checks/` are git-ignored by default. Everything else is
small JSON and HTML that reads well in a diff.

## Architecture

```
            coding agent ── reads SKILL.md, writes draft/ ──▶ picky-eater CLI (one bundled file, no dependencies)
                                                                   │ validate · propose · preview · status · implement · check · report
                                                                   ▼
┌─ user's browser ───────────────────────────────────┐    ┌─ local server (loopback only) ────────────────┐
│ REVIEW PAGE            http://127.0.0.1:P          │◀──▶│ review listener  :P   UI + JSON API (token)   │
│  top bar · sheet · options popover · cut strip     │    │                                               │
│  ┌ stage frame ──────────────────────────────────┐ │    │ stage listener   :Q   reverse proxy           │
│  │ sketch board: sandboxed document, no scripts  │ │    │   └─▶ user's dev server (localhost:5173)      │
│  │ live board:   http://127.0.0.1:Q  (the app)   │◀┼───▶│   injects one script tag into HTML responses  │
│  └───────────────────────────────────────────────┘ │    └───────────────────────────────────────────────┘
│        ▲ postMessage only (live boards)            │
└────────────────────────────────────────────────────┘
```

### Stage drivers

One interface, two implementations, one shared core (patch engine, composer, cut player,
measuring, dot rendering).

| | `sketch` board | `live` board |
|---|---|---|
| Document | Composed in the browser from frame + chosen fragments, in `<iframe sandbox="allow-same-origin">` (no `allow-scripts`) | The real page from the stage origin |
| Who changes the page | The review page, directly through the frame's DOM | The injected script, on request from the review page |
| Channel | Direct DOM access | `postMessage`, origin and source checked on both sides |
| Dots | Drawn inside the page in an isolated shadow root, so they scroll with the page without lag | Same code |
| Options popover, thumbnails, choosing, approving | Review page | Review page |

**Verified on 2026-11-13** in Chromium, Firefox and WebKit: in a script-less sandboxed frame,
native controls, sticky positioning, form validation state, hover state, scroll position and
layout can all be read and changed from the outside, and no script in the frame runs. WebKit
does **not** deliver events from such a frame to listeners added from outside (Chromium and
Firefox do). The design therefore never listens inside the mockup. The review page reads the
frame once per animation frame, and places its own invisible hit targets over dots and over
controls that lead to another cut. This is one code path for every browser.

### Thumbnails

A thumbnail is the page with that one option applied, cropped to the part that changes and
scaled down. It is rendered in a script-less sandboxed frame.

- `sketch`: compose the page with the option swapped in, crop to the area.
- `live`: the injected script serialises the current DOM and stylesheets once when a dot is
  opened; the review page applies each option's patch to a copy of that snapshot and only then
  makes the copy inert. No extra page loads. A `script` operation is not run on a copy, so its
  effect is missing from the thumbnail; such an option is marked "Approximate".
- Cut frames in the strip use the same renderer. On a live board the cuts of a page state get
  their picture the first time that state is visited.
- The sheet of a live board is one picture of the whole page behind the cells: one slice per
  screen height, each a copy scrolled to its part, so that screen-relative sizes come out right.
  Parts that only appear on scrolling (a reveal effect) fill in as the person scrolls.

### Stage proxy (live boards)

A reverse proxy mounted at the root of its own port, so root-relative paths keep working.

| Concern | Handling |
|---|---|
| HMR WebSocket | `Upgrade` requests are piped to the dev server with `Host` and `Origin` rewritten |
| Host checks in dev servers | Requests are sent upstream with the dev server's own `Host` and `Origin` |
| Cookies | `Domain` is removed from `Set-Cookie`. The review page is opened on the same hostname as the app (`localhost` or `127.0.0.1`), so the frame is same-site and `SameSite` cookies are sent |
| CSP and framing headers | `X-Frame-Options` and `frame-ancestors` are replaced by "review origin only". An existing script nonce is reused for the injected tag; without one, the address of the stage listener's own scripts is added to `script-src`. Patch CSS and the dots' styles are added through constructed stylesheets, which CSP does not block |
| Service workers | Blocked by default (registration answers with a no-op), because a caching worker can serve pages that bypass the proxy. `"serviceWorker": "allow"` for apps that mock their API with one |
| Absolute URLs | `Location` headers and dev-server URLs in HTML are rewritten to the stage origin |
| Storage isolation | The stage port is derived from the project path (the next free one if it is taken), so two projects do not share an origin's storage, and a login survives restarts |
| Upstream | Loopback addresses only. The proxy cannot be pointed at another machine |

**When the proxy does not work** (an API that only accepts the dev server's own origin, for
example), `attach: "tag"`: `picky-eater attach` adds one marked script tag to the app's
development entry, the app is framed from its own origin, and `picky-eater detach` removes the
tag. `report` refuses to finish while the tag is present.

### Pages that redraw themselves

A framework redraws parts of its page whenever its state changes, a hot update replaces
components, and a page sent from the server is first "hydrated". Each can undo what a patch did,
or trip over it. `src/stage/keeper.ts` holds patches in place; the stage agent and the probe that
measures the approved look both use it.

| What the page does | What happens |
|---|---|
| Rewrites a text, attribute or class list a patch changed; replaces or removes an element a patch changed, wrapped or inserted | A `MutationObserver` notices. Every operation can tell whether its effect is still there; a patch that is not intact is taken off and applied again to what the page has now, in the same microtask, so nothing is painted in between |
| Asks a parent to remove, replace or insert before a child that a patch moved or wrapped (React, Vue, Angular) | The browser would refuse and the app would break. While such a patch is in place, `removeChild`, `insertBefore` and `replaceChild` first let the patches that moved things step aside, then run where the element really is; the patch goes back afterwards |
| Takes the element's present parent as the place to work in (Solid, Preact) | The same guard recognises elements a patch has displaced and puts them home first, so that the framework does not adopt the patched place as its own |
| Removes an element by asking the element itself (Svelte) | Nothing breaks; the patch finds its element gone and waits for it |
| Removes a run of sibling elements by walking from its first to its last (Svelte, Lit, static blocks in Vue) | If a patch had put the last one elsewhere, the walk would not stop and would take everything that follows. Just before a node is removed whose next sibling stands for a displaced element (its marker, its wrapper), the displaced elements are put back among their siblings, so the walk finds its end |
| Replaces the place an element was moved to (a hot update of that component) | The moved element still has its old place marked by a comment node, and goes back there before the patch is applied to the new markup |
| Is still taking over markup that came from the server | Operations other than `css` wait: until React's root is no longer dehydrated, a Vue app is mounted on its element, an Astro island has lost its `ssr` attribute, or, where a framework leaves no sign, until its scripts have stopped arriving. Never longer than eight seconds |
| Undoes a patch again and again, right after it was put back | After twenty times in a row the patch is left off and reported (`REVERTED`): the person reads that the option cannot be shown, the agent reads why in `status` |
| Adds a row to a list, removes one, or draws an item anew | Nothing was taken back, but the patch no longer covers what its selectors find. Every operation on "everything a selector finds" (`set`, `wrap`, `move`, the items of `each`) remembers what it found once the whole patch was in place, and a later match that is not among them means the list has grown: the patch is laid over the page again. This is told apart from a page that undoes a patch, and never counts towards giving up |

`css` operations are constructed stylesheets and are not affected by any of this.

**What it cannot do.** Elements inside a shadow root are out of reach of selectors. A patch that
sets the text of something the app updates hides the live value. And one case of the sibling walk
above remains: when a patch has moved or wrapped the **first** element of a run that Svelte or
Lit removes as one, the walk starts in the wrong place, and the rest of the run stays on the page
until it is reloaded (seen with Svelte 5; nothing else is damaged). `css` shows the same options
without that risk.

### Comparison after implementation

`implement` (before any code is written) and `check` (after) measure the same things in a
headless browser, with one script (the probe) that is evaluated in the page:

- for every viewport × cut: the box around everything drawn in each area, the space above it, and
  inside it the box and computed styles (type, color, background, border, radius, padding,
  layout) of every piece of text, control, picture and painted box;
- a picture of the screen in each cut, and of each area.

`implement` measures the approved page: on a sketch board the mockup, composed by the same code as
the review page and loaded as markup; on a live board the running page with the approved patches
laid over it, which is why it has to run before the source changes. `check` measures the built
page: the address, the element of each area and the steps of each cut come from `built.json` on a
sketch board, and from the board itself on a live board.

Elements are paired by **role and text** on both kinds of board ("heading: Learn to ship in a
day", "box around heading: Week"), because an implementation is free to use its own markup. An
area is the box around what is drawn in it, not its wrapper element, for the same reason. What
has to be told apart by a number (the second "Done", "picture 3") is numbered in the order a
person reads it, line by line and left to right, not in the order of the markup: a preview that
puts a line first with a style and an implementation that writes it first look the same, and are
the same to the comparison.

A running page tells the time, and a minute later it tells another ("36m", "3 minutes ago",
"10:28 AM"). On a live board a text that is nothing but a time is paired as "a time", and a time
inside a sentence is left out of what the sentence is paired by. Such an element may be wider or
narrower than it was; it may not stand on another line, be another size or have another style.
Other data that changes between the approval and the check (a row that arrived) is a difference,
and is for the agent to explain with `report --deviation`.

`check` prints one line per difference
(`hero · desktop and phone · top: heading "Learn to ship in a day" font-size 40px, approved 56px`)
and exits with 20 until they are gone. Only causes are listed: what follows from a difference (a
larger font moves everything after it) is left out and shows up again if it stays. Pictures are
compared in the browser itself and are the last resort: a picture difference is only reported for
an area whose measurements agree. The review page shows "Approved" next to "Built" for every area
(**Built page**).

The headless browser is the Chrome or Edge already installed, driven over the DevTools protocol
with Node built-ins. No dependency is added to the user's project.

### Pages behind a sign-in

Most product pages are. Two browsers look at the page, and neither has the other's session.

**The person's browser** shows the app through the stage listener, which is an address of its
own: the app has no session there the first time and shows its sign-in screen. The stage agent
recognises one (a password field, or a nearly empty page whose address, title or heading speaks
of signing in) while areas are missing, and the review says "Sign in, in the preview" instead of
calling every area "not found". The person signs in right there, in the app itself. Nothing is
done for them afterwards, because a sign-in may have a second step and only they know when it is
over. If the app then stands on another page than the one of the board (its start page) and
areas are missing, the review offers "Open the page of this board"; the same button is the way
back after following a link of the app.

**The headless browser** of `inspect`, `validate`, `implement` and `check` starts empty every
time. `picky-eater signin --url <page> --steps '[…]'` opens an address, plays the steps of a
sign-in (or only opens a one-time link), and keeps what the browser then remembers: its cookies
for this machine and the local storage of the page it ended on. The later commands start with
that. It is the Playwright "storage state" idea with nothing but the DevTools protocol.

- The session is that of the project's **development account**, which the agent already has the
  means to use (seed data, README, the project's own tooling). The person's browser is never
  read: no cookie of theirs is copied, replayed or sent anywhere.
- It is kept in `.picky-eater/runtime/signin.json`, readable by the user only, in a folder that
  picky-eater's own `.gitignore` leaves out. `signin --clear` removes it.
- The stage listener does not add it to requests. A listener that attached a session to whatever
  reaches it would hand that session to any page the person has open; the person's preview is
  signed in by the person.
- Only addresses on this machine can be opened. A sign-in that leaves the machine (an identity
  provider) cannot be played; a development build usually has a local way in.

### App screens

A page of an app is denser than a page of sections, and is drawn differently. What follows was
found by running the tool on a real product (the web client of T3 Code: React 19, TanStack
Router, Tailwind, Base UI; see `docs/compatibility.md`).

- **Names, not looks.** Utility classes (`flex`, `mt-4`, `md:w-1/2`) say how an element looks and
  change with its state. `inspect` builds selectors from ids that were not generated, test ids,
  `data-*` attributes the authors wrote (`[data-chat-header]`), `data-slot`, labels and roles,
  and only then from structure, starting at the nearest named part.
- **Closer maps.** `inspect --within <selector>` maps one part down to its controls.
  `inspect --steps '[…]'` maps the page after a person's actions, and lists what lies over the
  page (a dialog, a menu, a popover drawn outside the app's root) first.
- **Screens that arrive late.** A click changes the address at once and the next screen is drawn
  when its code has loaded. Steps are played one at a time and each is over when the page has
  answered it; a cut with a `seen` mark is reached when the mark is on the page.
- **Components of libraries.** The element of a tooltip trigger or a slot is written by a library
  component that the project only uses. The component named for it is the one the file defines.
- **Several packages.** A development server names files from its own root (`/src/App.tsx`),
  which in a repository of several packages is one of them. The file is looked up in every
  package, and a path that several have goes to the package the page has already named.
- **What a dialog covers** is still on the page. Its areas keep their place in the miniature of
  the page but lie under the areas of the dialog.

### Source layout

```
src/
  core/      schemas, board graph, composer, patch engine, cut player, measuring   (runs in Node and browser)
  session/   revisions, choices, requests, approvals, events, atomic files, git fingerprints
  server/    review listener, stage proxy, security
  stage/     injected script for live boards, the keeper of patches, what frameworks tell about a page
  review/    the review page (vanilla TypeScript and CSS)
  check/     headless browser driver, comparison, looking at a running page (inspect, validate)
  cli/       commands
skills/picky-eater/   SKILL.md, references/, scripts/picky-eater.mjs (built bundle)
examples/  new-screen/  static-site/  react-app/
tests/     unit/  integration/  e2e/  stacks/ (real development servers, run on request)
```

## Security model

| Rule | How it is enforced |
|---|---|
| The app cannot choose or approve | The app runs on another origin and can only send messages. The review page treats them as untrusted data for drawing (positions, hover, snapshots). Choices and approval are created only by clicks on elements of the review page |
| Mockups cannot run code | `validate` rejects scripts, event-handler attributes, frames and remote URLs; the composer strips them again; the frame has no `allow-scripts`; the mockup's CSP is `default-src 'none'` with inline styles and inlined images only |
| Snapshots of the app are inert | Rendered only in script-less sandboxed frames |
| Only this machine | Both listeners bind to loopback, check the `Host` header (DNS rebinding) and proxy only to loopback |
| Only the person with the link | 256-bit token in the URL fragment, kept in `sessionStorage` (scoped to the origin, including the port), sent as a header. No cookies. State-changing requests also need a same-origin `Origin` |
| Nothing leaves the machine | No telemetry, no remote assets, CSP `default-src 'none'` on the review page |
| Only a person approves | There is no approve command. The CLI and the check page use a read-only credential that the API refuses for choices and approval. Approval binds to the revision digest and the exact choices shown |
| Approved means current | `implement` refuses when the revision, the choices or the fingerprinted source files changed since approval |

Honest limit: an agent with shell access to the same machine can forge files or drive a browser.
The product gives it no legitimate way to approve and records every approval in the event log;
it cannot make forgery impossible. `SECURITY.md` will say so.

## Where the tokens go

| Step | Agent cost |
|---|---|
| Storyboard | One board per draft: skeleton, short sketches, small fragments or patches |
| Choosing, previewing, switching cuts or widths | None. Composed in the browser from the pre-written pieces |
| A change request | Only the named area is rewritten. Other choices carry over to the new draft |
| Options that are not chosen | Never implemented. Real code is written once, after approval |
| Implementation | `implement` prints a brief with only the chosen options, their `build` notes and source locations |
| Comparison | `check` prints differences only, not pages or images |

## Pattern catalog

The agent does not invent what to offer. `catalog/` holds 146 layout, control and motion patterns and 50
recurring decisions, researched from established UI/UX books (Tidwell, Cooper, Wroblewski, Krug,
Norman, Johnson, Yablonski and others), public design systems and usability research. Every entry
has conditions for and against, buildable rules, real products that use it, and sources. It is the
source of [patterns.md](patterns.md).

Motion is one of its categories. How candidates are narrowed down, which option gets the mark and
how earlier choices count is planned in [recommendation.md](recommendation.md).

| Where it is used | How |
|---|---|
| Drawing options | `picky-eater patterns` lists decisions and patterns; a decision's candidates are the options of an area, minus those the product rules out |
| Mockups | Each drawable pattern has a script-free snippet built on the component kit that every mockup page includes |
| `validate` | An option's `pattern` must be a catalog id |
| Building | `status` names the pattern of every approved option; its rules are part of what was approved |

## Agent workflow and CLI

```
analyse the repository
  → picky-eater new          create a session and a draft folder
  → picky-eater signin       existing page behind a sign-in: sign the headless browser in, once
  → picky-eater inspect      existing page: its parts, with selector, component and source file
  → picky-eater recommend    existing page: where it could move, what passes there, what the person chose before
  → picky-eater patterns     look up what to offer for each area
  → write the board          areas, options, cuts
  → picky-eater validate     structure, graph, safety, anchors and patches on the real page
  → picky-eater propose      freeze the draft as revision rN
  → picky-eater preview      print the review link
  → picky-eater wait         approved · change requested · still waiting
        change requested → edit that area → propose → wait again
  → picky-eater implement    refuse unless approved and current; capture the answer key; print the brief
  → write the real code
  → picky-eater check        compare with the answer key; fix and repeat until it passes
  → picky-eater report       record what was built, the check result and any deviation
```

`status` says where the session stands and what to do next; on a live board it also lists what
the review page could not find on the running page. Other commands: `schema`, `kit`, `sessions`,
`taste` (what is remembered of the person's choices; `taste propose` for a rule they then keep or
discard), and `attach` / `detach` for `"attach": "tag"`.

## Milestones

Each milestone ends with unit and integration tests, Playwright end-to-end tests, and a running
review screen for a manual check in the browser.

| # | Goal | Done when |
|---|---|---|
| 1 | Concept and plan | **Done.** This document is confirmed |
| 2 | New screen, end to end | **Done.** `examples/new-screen` goes from grey storyboard to approved mockup: dots, drawn options, live preview, sheet and counter filling up, cut strip with a form flow and a sticky header, Desktop/Phone, change request, history, approve. E2E in Chromium, Firefox and WebKit |
| 3 | Storyboard on an existing product | **Done.** `examples/static-site` (vanilla HTML and JS with scroll reveal, sticky header, validated form) runs through the proxy with patches of every level. Tests prove that scroll effects, sticky and the form still work after patches, and that HMR sockets, cookies, CSP and service workers are handled. `attach: "tag"` works. Real development servers followed in milestone 5 |
| 4 | Comparison after implementation | **Done.** `implement`, `check`, `report`. A faithful implementation passes; planted deviations (size, color, position, a missing state) are each reported. "Approved / Built" view in the review page |
| 5 | Framework apps | **Done.** `examples/react-app` (Vite + React 19): patches survive re-renders, a remount of the page and hot updates; areas resolve to component and file (`inspect`, `validate`, the brief of `implement`). The keeper lets a framework through when it wants an element back that a patch has moved. Run against the development servers of 14 stacks (`tests/stacks`), and in three browsers against a page that redraws itself in the three ways frameworks do |
| 6 | A real product | **Done.** Run on the web client of T3 Code (a monorepo; React 19, TanStack Router, Tailwind, Base UI; behind a pairing screen; lists that grow while one looks) by hand and by Claude Code. Added: `signin`, the sign-in note and the way back in the review, `each` and patches that follow a growing list, `inspect --within` / `--steps`, source lookup across packages, steps that wait for a late screen, comparison in reading order and with moving times. The agent's build of two approved choices, in component files of 1,800 and 3,800 lines, compares as built as approved |

Milestone 2 also carried the foundation: schemas, session store, the review listener's security
layer, the build script, CI, and the pattern catalog with its component kit.

## Repository plan

Version 1 was removed at the start of milestone 2: its `src/`, `tests/`, `schemas/v1/`,
`examples/walkthrough/`, `docs/architecture.md` and `docs/research.md`.

Carried over from version 1, adapted: the loopback, token and `Host` checks and body limits of
the server; atomic writes and lock files; the esbuild bundle script with its `--check` mode; the
zod to JSON Schema export; the skill folder layout and agent metadata.

`examples/settings-page`, the React app of version 1, became `examples/react-app` in milestone 5.

## Risks and decisions

| Topic | Position |
|---|---|
| WebKit does not deliver events from a script-less frame | Verified. Designed around it (no listeners inside mockups). Controls that lead to another cut lose their own hover style, because a hit target sits over them |
| Snapshot thumbnails of very dynamic pages (canvas, video, shadow DOM) | Those parts appear blank in thumbnails only. The stage always shows the real page |
| A patch that hides the element its area is anchored on | The area then stands on the option's `focus` element; without one it has no dot until the option is changed from the sheet |
| `validate` looks at the running page in a browser that is not the person's | Its findings on the page are warnings. The review page reports what it cannot find from the person's browser to `status` |
| Pages behind a sign-in | Decided: the headless browser is signed in with the project's development account by `signin`, and keeps that session locally; the person signs in themselves, inside the preview. The session of the person's browser is never copied or replayed ([Pages behind a sign-in](#pages-behind-a-sign-in)). Not covered: a sign-in that leaves the machine |
| Data that changes between approval and check | Times are paired as times. A row that arrived, a counter that moved: reported as differences, for the agent to explain with `--deviation`. A fixed set of development data avoids it |
| Moving framework-owned nodes | The keeper steps aside when the framework wants its elements back ([Pages that redraw themselves](#pages-that-redraw-themselves)). CSS reordering is still preferred where it shows the same thing |
| Reading what frameworks leave on the page | Internal to each framework and different between versions. Guarded, optional, and run against current versions by `tests/stacks` |
| Apps that fail behind the proxy | `attach: "tag"` |
| Node version | Require Node 22 or later (built-in WebSocket for the DevTools protocol; Node 20 is past end of life) |
| No Chrome or Edge installed | `check` falls back to a Chromium downloaded by Playwright if one exists, otherwise says how to get one |
| Approval through chat | Removed. Approval happens only in the review page |
