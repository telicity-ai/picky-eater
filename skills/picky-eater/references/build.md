# Building what was approved, and proving it

After approval the mockup is the answer key. Three commands make sure the built page is that page.

```
pe implement     # BEFORE you change any code: measures the approved page, prints what to build
…write the code…
pe check         # measures the built page the same way; exit 0 it matches, exit 20 it differs
pe report --summary "<what you built>"
```

They drive a Chrome, Edge or Chromium that is already installed, without a window. Nothing is
downloaded. The browser can only reach this machine.

## `pe implement`

Run it once, before the first change. It refuses unless the person has approved.

- **New screen:** it draws the approved mockup and measures it.
- **Existing page:** it opens the running page, lays the approved patches over it and measures
  that. This only works while the page is still as it was, so do it before you edit the source.
  The development server must be running.

It measures every width and every cut: where each area is, and for every piece of text, control,
picture and painted box in it: its position, its size and its styles (type, colors, borders,
radius, padding, layout). It also keeps a picture of each area. Then it prints the brief: the
chosen option of each area with its `build` note, its pattern, and the mockup file or the source
location. Options that were not chosen are not mentioned; do not build them.

## Build

Write the page in the project's own components and conventions. The measurements are compared by
what a person would call an element, not by markup:

- **Keep the words.** A heading is paired with the built heading that has the same text; a button
  with the button of the same label. Change a text and the comparison reports one element missing
  and one that was not approved.
- **Markup is yours.** Other tags, extra wrappers, other class names and another order in the
  markup are fine, as long as the same things are drawn in the same places with the same styles.
  What the preview did with a style (a line shown first) you may build by writing it first.
- **Copy the numbers, not the look.** Sizes, colors, spacing and radii are in the mockup's
  stylesheet (`revisions/r<n>/styles.css`) and in the option's fragment. Use those values.
- **Kit classes are mockup-only.** If the mockup uses `pk-*` classes, `pe kit` prints their
  styles; write the same styles in the project's own way.
- **A patch is a preview.** On an existing page, make the change properly in the source named by
  the area's `source`. A `script` patch only approximates the behavior to build.
- Every cut must exist in the built page: the error message when the form is sent empty, the
  confirmation when it is sent, the header that changes once the page is scrolled.

## `built.json` (new screens)

Tell picky-eater where the page is and which element is which area. Write
`.picky-eater/sessions/<id>/built.json`:

```json
{
  "url": "http://localhost:5173/signup",
  "areas": { "nav": "header.site-nav", "hero": "#hero", "signup": "#signup", "signup-error": "#signup .field-error", "signup-done": "#signup .ticket" },
  "cuts": {
    "error": { "steps": [{ "scroll": "#signup" }, { "click": "#signup button[type=submit]" }] },
    "sent":  { "steps": [{ "fill": "#name", "value": "Mina Park" }, { "fill": "#email", "value": "mina@example.com" }, { "click": "#signup button[type=submit]" }] }
  }
}
```

| Field | Meaning |
|---|---|
| `url` | The built page on the project's development server (`http://localhost…` or `127.0.0.1`). Start the server before `pe check`. |
| `areas` | For each area of the board, a selector for the element that implements it. Everything drawn inside that element is compared. |
| `cuts.<id>.steps` | What a person does to reach that cut on the built page, from a freshly opened page: `scroll`, `fill` + `value`, `click`, `wait`. Needed for every cut that is reached by acting (the mockup reached it by `data-pe-go`). |
| `cuts.<id>.at` | Where that cut scrolls to, if the built page uses another id than the board's `at`. |

On an **existing page** `built.json` is optional: the page, the anchors and the steps are the ones
of the board. Name an area or a cut only if the implementation moved it (an area whose anchor you
removed, for example).

## `pe check`

It prints one line per difference, causes only:

```
hero · desktop and phone · top, scrolled and 3 more: heading "Learn to ship in a day" font-size 40px, approved 56px
signup · desktop · error: the area is missing (approved: on the page)
page · desktop · sent: this moment could not be reached on the built page ("#send" did not appear on the page)
nav · desktop · top: the picture differs in 12.4% of its pixels (allowed: 3.0%)
```

Read a line as: *area · widths · cuts: element, property, built value, approved value*.

- A difference usually causes others (a larger font moves everything below it). Only the cause is
  listed. Fix what is listed and run `pe check` again; what remains shows up then.
- "is missing": no element with that role and text. Often the text differs, or the area's selector
  in `built.json` points at the wrong element.
- "is not in the approved page": text, a control or a picture that nobody approved.
- "could not be reached": the `steps` of that cut failed. Fix the steps, or the page.
- "the picture differs": the measurements agree but the area does not look the same (a background
  picture, a gradient, an icon). Compare `checks/c<n>/<width>.area.<area>.png` with the same file
  under `answer-key/`.
- "moves as …, approved …", "approved: … The built page does not have it", "the built page has: …
  That was not approved": what moves in an area where a motion was offered is part of what was
  approved: the property, the time, the curve, and how often it runs. `pe implement` prints it
  ("moves (measured, to be built as such)"). Build exactly those values. "with reduced motion"
  is the same for people who asked their system for less motion: what was approved for them is
  usually "nothing moves", so the `prefers-reduced-motion` rule of the option has to be built too.
- On an existing page the data is alive. A time that has moved on ("36m" then "38m", "3 minutes
  ago", "10:28 AM") is not a difference: it is paired as `(a time)`. Other data that changed since
  the approval is: a row that arrived, a counter. If you did not cause it, look at the two
  pictures to be sure and declare it with `--deviation`; do not change code to chase it.

Fix the **code** until `pe check` exits 0. Never edit the answer key, the board, or `built.json` to
make a difference disappear.

## `pe report`

```
pe report --summary "Sign-up page at /signup: sticky nav, split hero, timeline, stacked form with inline error and ticket confirmation."
```

It records the result with the last comparison. If a difference has to stay (the real page shows
live data where the mockup had a placeholder), say so, once per difference:

```
pe report --summary "…" --deviation "schedule: times come from the API, so the texts differ"
```

Without `--deviation`, `report` refuses while the last comparison found differences. Tell the
person about every deviation; they can open **Built page** in the review to see approved and built
side by side.
