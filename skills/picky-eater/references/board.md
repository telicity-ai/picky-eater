# Writing a board for a new screen

This is the format for a page that does not exist yet. For a page that exists, read
[live.md](live.md) instead.

A board is one folder: `board.json` plus the files it names. `pe new` creates a small working one;
`pe schema` prints the JSON Schema of `board.json`.

```
draft/
  board.json            areas, options, cuts
  frame.html            the page skeleton: everything that is not a choice
  styles.css            shared look: colors, type, spacing, component styles
  areas/<area>/sketch.html        the rough drawing of an area
  areas/<area>/<option>.html      one fragment per option
  assets/…                        images (png, jpg, gif, webp, avif, svg)
```

## board.json

```json
{
  "schema": "picky-eater/board",
  "schemaVersion": "2.0",
  "title": "Workshop sign-up",
  "base": { "kind": "sketch", "frame": "frame.html", "styles": ["styles.css"] },
  "areas": [
    {
      "id": "hero",
      "label": "Top banner",
      "sketch": "areas/hero/sketch.html",
      "options": [
        { "id": "split", "label": "Text on the left, picture on the right", "html": "areas/hero/split.html",
          "pattern": "hero-split", "suggested": true,
          "build": "Two columns from 860px up, one column below. The button scrolls to the form." },
        { "id": "centered", "label": "Centered text, no picture", "html": "areas/hero/centered.html", "pattern": "hero-centered" }
      ]
    },
    { "id": "form-error", "label": "Message when the form is sent with a mistake", "cuts": ["error"], "options": [ … ] }
  ],
  "cuts": [
    { "id": "top", "label": "Top" },
    { "id": "scrolled", "label": "Scrolled", "sameAs": "top", "at": "#schedule" },
    { "id": "error", "label": "Sent blank: error", "at": "#signup" },
    { "id": "sent", "label": "Sent", "at": "#signup", "fill": { "#email": "mina@example.com" } }
  ]
}
```

| Field | Meaning |
|---|---|
| `areas[].label` | What a person would call this part of the page. No design terms. |
| `areas[].sketch` | The rough drawing shown until an option is chosen. Optional: without it the area is a labelled grey block. |
| `areas[].cuts` | Show this area's dot only in these cuts. |
| `options[].label` | Says what the option *is* in plain words ("Three cards side by side"). Read by screen readers and shown as a tooltip; the review page shows the drawing, not this text. |
| `options[].pattern` | The catalog pattern this option uses. Checked against the catalog. |
| `options[].suggested` | At most one per area: the one you would pick. If the person chose differently before, the review may show the mark on another option; your draft is not changed. |
| `options[].because` | On the suggested option: one sentence on why this one, in the person's words, not design terms ("The screenshots carry information, so each gets its own row"). Shown only when they point at the mark. |
| `areas[].decision` | The catalog decision this area answers (`landing-hero`, `open-in-place`). What the person chooses is remembered by it. |
| `areas[].rejected` | Up to three candidates you considered and do not offer: `[{ "pattern": "stagger-in", "why": "This page is opened many times a day." }]`. Shown under "Not offered" behind the mark. |
| `options[].build` | What to build if this option is approved: breakpoints, behavior, anything the drawing does not show. For you, later. |
| `options[].focus` | A selector inside the option. Set it when the part that differs is much smaller than the area; thumbnails are cropped to it. |
| `viewports` | Optional. Default: Desktop 1280×800 and Phone 390×760. |

## The page frame

`frame.html` is a complete page. An element with `data-pe-area="<id>"` is the place of an area:

```html
<body>
  <header class="bar" data-pe-area="nav"></header>
  <main>
    <section data-pe-area="hero"></section>
    <section id="speakers">…finished content that is not a choice…</section>
    <section id="signup" data-pe-area="signup"></section>
  </main>
</body>
```

- The element stays; the sketch or the chosen option becomes its content. Put layout that must not change (sticky, grid position, an `id` that cuts scroll to) on this element.
- The review page sets `data-pe-state="sketch" | "preview" | "chosen"` and `data-pe-option="<option id>"` on it. Your CSS may use them.
- An option may contain `data-pe-area` elements of other areas. Such an area exists only while that option is chosen, and its dot appears then. Areas cannot contain each other in a loop.

## Sketches

A sketch shows where things go and the one or two phrases that identify the area. Use the sketch kit; do not style it.

| Class | Draws |
|---|---|
| `pe-row`, `pe-col`, `pe-grid` (`--pe-cols`), `pe-space` | Layout |
| `pe-text`, `pe-note` | The key phrase, a small note |
| `pe-line` (+ `pe-short`), `pe-block` | Lines of text, a block |
| `pe-image`, `pe-button`, `pe-field`, `pe-circle` | Picture, button, form field, avatar |

```html
<div class="pe-row">
  <div class="pe-col"><p class="pe-text">Learn to ship in a day</p><div class="pe-line"></div><div class="pe-button"></div></div>
  <div class="pe-image" style="height: 240px"></div>
</div>
```

## Options

An option is an HTML fragment: no `<html>`, `<head>` or `<body>`.

- Keep it small. Shared styles go to `styles.css`; an option holds markup and, at most, a few lines in a `<style>` element.
- Two options of one area use the same content and differ in structure, so the comparison is about the structure.
- Start from the pattern's snippet (`pe patterns <id>`). Snippets use the component kit (`pk-*` classes). Restyle the kit through its variables in your stylesheet: `--pk-accent`, `--pk-ink`, `--pk-muted`, `--pk-line`, `--pk-surface`, `--pk-soft`, `--pk-radius`, `--pk-font`. Kit rules have no specificity, so any rule of yours wins.
- Make it work at both widths. The page is shown at real screen sizes; use media queries as the real page would.

**Not allowed** (refused by `validate`): scripts, event-handler attributes, `<iframe>`, `<object>`, `<link>`, `<base>`, `@import`, anything loaded from the network, and links that leave the page. Links are `href="#"` or `href="#section-id"`. Images are files in the draft folder.

## Controls work without scripts

The mockup cannot run code, and it does not need to:

- Native controls work as they are: fields, checkboxes, radio buttons, `<select>`, `<details>`, `:hover`, `:focus`, `:checked`, `:has()`, form validation (`required`, `type="email"`).
- `position: sticky` and `fixed` work: the page scrolls inside a frame of real screen height.
- `html[data-pe-scroll="scrolled"]` is set once the page is scrolled, `"top"` before. Use it for a header that shrinks.
- Everything else is a cut.

## Cuts

A cut is one moment of the page. The strip under the page shows them in order.

| Field | Meaning |
|---|---|
| `at` | Scroll so that this element is at the top of the screen. |
| `sameAs` | This cut is the same page state as another cut, at another scroll position (needs `at`). |
| `fill` | Form values to show: `{ "#email": "mina@example.com", "#terms": true }`. |

The first cut is the page as it opens. A cut without `sameAs` is a **page state**; the page root carries `data-pe-cut="<id>"`.

Fragments (and the frame) say what each state shows:

```html
<form data-pe-not="sent">
  <input id="email" type="email" required />
  <div data-pe-area="form-error" data-pe-in="error"></div>
  <button type="button" data-pe-go="sent" data-pe-go-invalid="error">Save my seat</button>
</form>
<div data-pe-in="sent">You are in.</div>
```

| Attribute | Meaning |
|---|---|
| `data-pe-in="error sent"` | Shown only in these states. |
| `data-pe-not="sent"` | Hidden in these states. |
| `data-pe-go="sent"` | Pressing this control moves to that state. |
| `data-pe-go-invalid="error"` | …unless the form it is in is not valid; then it moves to this state. |

Use `html[data-pe-cut="error"] …` in CSS for state styling, for example `html[data-pe-cut="error"] input:invalid { border-color: red }`.

## Before `pe propose`

- Every area has 2 to 4 options that look different at a glance, one of them suggested.
- Every option has a `build` note if the drawing leaves anything open.
- The page reads well with every area on its suggested option, and nothing breaks with any other combination.
- Each cut shows something a person needs to decide or check.
