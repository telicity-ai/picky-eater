# Recommendations: motion, reasons and taste

How picky-eater decides what to offer for an area, which option it marks as suggested, and how
that gets better with every approval. It extends [concept.md](concept.md), which stays the
description of the review screen, the board and the comparison. Everything described here is
built; the [Status](#status) table says how each part was checked.

## Contents

- [Why](#why)
- [Decisions](#decisions)
- [Where the ideas come from](#where-the-ideas-come-from)
- [The pipeline](#the-pipeline)
- [Motion](#motion)
- [Reasons](#reasons)
- [Taste](#taste)
- [Changes to the formats](#changes-to-the-formats)
- [Status](#status)
- [Open questions](#open-questions)

## Why

Until now a recommendation was this: the agent searches the catalog by keyword, picks two to four
patterns for an area and marks one `"suggested": true`. Three things were missing.

| Missing | What it looked like |
|---|---|
| **Motion** | The catalog had no motion patterns. A run on a real landing page produced five areas, all of them layout. The FAQ that snaps open, the button without press feedback and the hero that could have an entrance were never candidates |
| **Reasons** | The mark says "this one" and never why. What the agent considered and left out is not recorded anywhere |
| **Memory** | Every session starts from zero. A person who picks the quiet option five times is offered the loud one as suggested the sixth time |

The comparison after building was blind to motion as well: the probe switches every transition
and animation off before it measures, so a built page that did not move as approved passed.

## Decisions

Made on 2026-11-17.

| # | Decision | Instead of |
|---|---|---|
| 1 | **Motion is CSS only.** Transitions, keyframes, `@starting-style`, view transitions, scroll-driven animation. It is extended when that turns out to be too little | Springs and gestures driven by script, which would make every motion option "Approximate" and bring a runtime into the stage |
| 2 | **Reasons appear only on the suggested mark.** Pointing at the mark, or focusing it, shows why this option is suggested and what was left out. The popover itself stays as it is: only drawings | A line of text under every option |
| 3 | **Taste is stored per user, on the machine, across projects.** It weighs the same project most; a signal that keeps repeating across projects becomes a general preference | Taste kept per project only |

## Where the ideas come from

**[DesignBookmark Motion](https://designbookmark.com/motion)**: 84 animated components, 53 of its
own in plain HTML, CSS and JavaScript and 31 from Kokonut UI and SmoothUI (React).

| What it shows | What picky-eater takes |
|---|---|
| Most items are the moving version of a control the catalog already has (toggle switch, tab highlight, one-time code, button that turns into a result) | A motion is not a new kind of component. It is one more decision on an area that exists |
| Every demo plays by itself from a small script: `loop`, `tap`, `drag`, `hold`, `type`, `key` | What appears plays by itself when its option is pointed at, and again on Replay; cuts get `hover` and `key` steps ([In the review](#in-the-review)) |
| Spring presets with a meaning: "held by the pointer", "letting go", "large moves" | Durations and curves are named by what they are for, and a project's own tokens win |
| Its prompt: read the source, rebuild with the project's stack, keep the timing, use the project's colors and words | The `build` note of a motion option carries properties, duration, curve and what reduced motion gets |
| A slow-motion switch | The same switch in the review stage |

Its code is not copied. The catalog holds its own rules and CSS and links to the demos as
examples.

**Agent skills listed at [designbookmark.com/skills](https://designbookmark.com/skills)**:

| Skill | What picky-eater takes |
|---|---|
| `find-animation-opportunities` (Emil Kowalski) | The gate of four questions, the cap on how much is offered, and the rule that what was rejected is reported too |
| `learn-taste` (Emil Kowalski) | Only what the person did counts as their taste; a reason is never invented; a correction is generalized to a class of cases, not to everything |
| `variant` (Jakub Krehel) | Options differ on one axis that can be named; what every option must clear (keyboard, contrast, reduced motion) is a floor, not an axis |

## The pipeline

```
1 Read       inspect --profile     stack, motion library, tokens, and the moments where something changes
2 Find       moments × catalog     a motion says what sets it off; matching is mechanical
3 Gate       four questions        each candidate passes or is rejected, with the reason kept
4 Rank       catalog + taste       which option gets the mark, and why
5 Draw       the agent             writes the board, once (as today)
6 Play       the review page       the motion plays on the real page; slow motion; reduced motion
7 Check      implement, check      the built motion is compared with the approved one
8 Learn      approval, requests    what was chosen goes back into 4
```

Steps 1 to 4, 7 and 8 are done by the command line and are the same on every run. The agent does
step 5, as before, and pays no more tokens for the rest than the text the commands print.

| Step | Command | Where |
|---|---|---|
| 1 | `inspect --profile` | `src/check/profile.ts` |
| 2, 3 | `recommend` | `src/recommend/recommend.ts` |
| 4 | `recommend`, and `propose` for the mark | `src/taste/score.ts`, `src/taste/record.ts` |
| 6 | the review page | `src/review/`, `src/stage/` |
| 7 | `implement`, `check` | `src/core/measure.ts`, `src/check/` |
| 8 | the review listener, at approval | `src/taste/store.ts` |

The split is deliberate: **narrow down by rule, then let the agent draw.** What can be decided
from data (how often a moment occurs, whether a motion is allowed there, what this person chose
before) is not left to the mood of a model.

## Motion

### The catalog

An eighth category, `motion`, with 20 patterns and 10 decisions. Each pattern has what every
pattern has (conditions, rules, examples, sources) and a `motion` block
([format](../catalog/README.md#motion-pattern)):

| Field | Meaning |
|---|---|
| `trigger` | What sets it off: `press`, `hover`, `state`, `open`, `enter`, `scroll`, `navigate`, `ambient` |
| `purpose` | `feedback`, `spatial`, `state`, `continuity`, `attention`, `explanation`, `delight` |
| `upTo` | The most frequent use at which it is still right: `constant`, `frequent`, `occasional`, `rare` |
| `intensity` | `none`, `subtle`, `moderate`, `expressive`. This is the axis taste learns on |
| `duration`, `easing`, `properties` | What is built |
| `reduced` | What a person who asked for reduced motion gets |
| `css` | A working rule set to start an option from |

| Decision | Candidates |
|---|---|
| `press-feedback` | `instant-change`, `press-scale`, `hold-to-confirm` |
| `card-pointer-feedback` | `instant-change`, `hover-lift` |
| `acknowledge-small-action` | `instant-change`, `icon-swap`, `status-swap`, `inline-confirmation` |
| `move-selection` | `instant-change`, `sliding-indicator`, `crossfade` |
| `open-in-place` | `instant-change`, `expand-height`, `fade-in` |
| `overlay-entrance` | `instant-change`, `fade-in`, `origin-scale`, `slide-in-panel` |
| `content-entrance` | `instant-change`, `rise-in`, `stagger-in`, `scroll-reveal` |
| `page-change` | `instant-change`, `page-crossfade`, `shared-element-morph` |
| `hero-ambient-motion` | `instant-change`, `rotating-words`, `marquee` |
| `mark-something-new` | `status-badge`, `badge-counter`, `attention-pulse`, `coach-mark` |

`instant-change` is a pattern like the others: "it does not move" has conditions, rules and
sources, and it is a candidate of every decision that offers a motion. The build refuses a
catalog in which that is not so.

### The gate

A motion is offered only if it passes four questions, in this order. They are in
[the skill](../skills/picky-eater/references/patterns.md) for the agent, and `recommend` applies
the first three by rule.

| # | Question | Rule |
|---|---|---|
| 1 | How often does a person meet this moment? | The moment's frequency must not be higher than the pattern's `upTo`. Anything done from the keyboard all day gets no motion |
| 2 | What is it for? | One `purpose` must be named. `delight` only where the frequency is `rare` |
| 3 | Does it fit its time? | Inside the pattern's `duration`. Most interface motion is under 300 ms |
| 4 | Does it get in the way? | Nothing moves for style where people read or work with data, and nothing waits for a motion before it can be used. This one stays a judgment |

And a cap: two motion areas on a page, three on a page that is met rarely. What passes the gate
beyond that is listed as "over the cap" and offered only if the person asks.

How often a moment is met is the less frequent of two things: how often the page is met (a page
that is read: rarely; a screen that is worked with: often; `--frequency` says otherwise) and how
often that kind of moment occurs on a page used all day (a press: often; a section that opens: now
and then). A moment the page already answers with motion of its own is left alone.

### What CSS only covers

| Covered | How |
|---|---|
| Press, hover and focus feedback | `transition` on `:active`, `:hover`, `:focus-within` |
| A state that the page changes itself (selected tab, open section, busy button) | The patch adds the `transition`; the page's own behavior changes the state |
| Entrances | `@starting-style`, keyframes |
| Opening to the height of the content | `grid-template-rows`, or `interpolate-size` with `::details-content` |
| Page changes on sites of separate pages | `@view-transition` |
| Reveal while scrolling | `animation-timeline: view()` behind `@supports` |
| Things that run by themselves | Keyframes, with a pause on hover and focus |

| Not covered, on purpose | Why it needs a script |
|---|---|
| Dragging, swiping, pull to refresh, anything that follows the pointer | Position comes from the pointer |
| Springs that can be interrupted and retargeted | State between frames |
| Numbers that count, text that scrambles or types | Content changes per frame |
| Moving an element between two places in the same page (layout animation) | Measuring before and after |
| Exits, when the framework removes the element at once | The element is gone before a transition can run |

A spring with one overshoot can be written as a CSS `linear()` curve. That is the first extension
when a pattern needs it: the curve is computed from stiffness and damping when the catalog is
built, and the option stays plain CSS.

### How an option carries a motion

Nothing new in the board. On an existing page a motion option is a `css` patch; on a new screen it
is a class in the shared stylesheet. The other option of the area is the page without the motion.

```json
{
  "id": "faq",
  "label": "How answers open",
  "anchor": ".faq-list",
  "source": { "file": "docs/styles.css", "selector": ".faq-list" },
  "options": [
    { "id": "keep", "label": "Answers open at once", "keep": true, "pattern": "instant-change" },
    { "id": "grow", "label": "Answers open smoothly", "pattern": "expand-height", "suggested": true,
      "patch": [{ "css": "@supports (interpolate-size: allow-keywords) { … }" }],
      "build": "styles.css: details::details-content grows from 0 to its height in 240 ms, cubic-bezier(0.22, 1, 0.36, 1), with a fade. Reduced motion: opens at once, content fades." }
  ]
}
```

### In the review

A motion has to be seen moving. On an existing page the patch is in the real page, and the person
presses, opens and scrolls there. Around that:

- **A thumbnail stands still.** An option that moves carries a small play mark, and its label says
  so for screen readers.
- **What appears plays by itself.** Pointing at a moving option, or choosing it, plays what it
  does when it appears (keyframes, a transition from its starting style). **Replay** in the top
  bar plays it again: the area is taken out of the rendering and put back within one task.
- **Slow** runs every transition and animation of the page at a quarter of its speed.
- **Reduced** shows the options as people get them who asked for less motion. It rewrites the
  media conditions of the option's own style sheets, so that their rules for reduced motion apply.
  The system setting is not touched, and neither are the styles of the person's app.
- The three switches only exist on a board that offers motion.
- **Steps** of a cut can now also be `hover` and `key`. They reach what a page opens by script
  when the pointer arrives or a key is pressed. A style on `:hover` or `:active` cannot be forced
  by a script; the person points and presses there themselves, which is why there is no `press`
  or `hold` step.
- **New screens:** the mockup has no scripts, so a state must change by itself (`:hover`,
  `:active`, `:checked`, `details[open]`). The kit has classes for that: `pk-m-press`,
  `pk-m-lift`, `pk-m-fade`, `pk-m-rise`, `pk-m-stagger`, `pk-m-expand`.

### In the comparison

`implement` and `check` read, for every area in which a motion was offered, what is declared to
move: every transition and animation on its elements and on what they generate (`::before`,
`::after`, the content of a `details`), as property, time, delay, curve and number of runs. It is
read with the page's own styles in force for a moment and nothing is waited for, so nothing gets
to move. A second reading is taken with reduced motion emulated in the headless browser.

Movements are not paired by element: an implementation may put a transition on another element
than the preview did. An area moves as approved if the same things change, along the same curve,
in about the same time (10 ms or 5%).

```
choose · desktop · top: moves as transform 400 ms cubic-bezier(0.22, 1, 0.36, 1), approved transform 160 ms cubic-bezier(0.22, 1, 0.36, 1)
choose · desktop · top: approved: transform 160 ms cubic-bezier(0.22, 1, 0.36, 1). The built page does not have it
choose · desktop · top: the built page has with reduced motion: transform 400 ms cubic-bezier(0.22, 1, 0.36, 1). That was not approved
```

- Only areas in which a motion was offered are read. Elsewhere motion was not part of what was
  decided.
- On a new screen the mockup is drawn with the kit and the page with the project's own
  components, which move in ways a mockup does not show. There, only what was approved is looked
  for; movement the built page has beyond it is not reported.
- An answer key taken before motion was measured says nothing about motion and still compares.

`validate` warns about the floor, per option of a board over an existing page and per shared
style sheet of a new screen:

| Warning | Meaning |
|---|---|
| `MOTION_NO_REDUCED` | Something moves, grows or turns, and there is no rule for `prefers-reduced-motion` |
| `MOTION_LAYOUT` | A property is animated that lays the page out again on every frame |
| `MOTION_ALL` | A transition names no property |
| `MOTION_SLOW` | The longest run is longer than the option's pattern allows |
| `MOTION_ENDLESS` | Something runs by itself for more than five seconds and nothing pauses it |

## Reasons

Three new fields of the board. None of them is shown as text in the popover.

| Field | Content |
|---|---|
| `options[].because` | One sentence on the suggested option: why this one. From the catalog's condition ("The screenshots carry information, so each gets its own row") or from taste ("You chose this over centered text in 3 projects") |
| `areas[].rejected` | Up to three candidates that were considered and left out, each with the question that removed it: `{ "pattern": "stagger-in", "why": "This page is opened many times a day" }` |
| `areas[].decision` | The catalog decision the area answers |

`validate` checks them against the catalog: a decision or pattern that does not exist, a pattern
that is both offered and rejected, a reason on an option that is not the suggested one.

**Where they appear.** The suggested option carries a small mark, as before. Pointing at the mark,
or reaching the option with the keyboard, opens a note with the `because` sentence and, below it,
"Not offered" with the rejected candidates by the name a person knows them by. If the mark was
moved by earlier choices, the note says so. Nothing appears on other options, and nothing appears
until the mark is pointed at. The note is also the option's description for a screen reader. The sentence in [concept.md](concept.md#the-review-screen) that the
popover holds "only the options" stays true for everything a person sees without asking.

Why rejected candidates are kept at all: a recommendation that only lists what it likes cannot be
told apart from a wish list. "No motion here: this list is used all day" is the more useful half.

## Taste

### What is stored, and where

In the user's home, not in a repository: `~/.picky-eater/taste/` (`PICKY_EATER_HOME` moves it).

```
~/.picky-eater/taste/
  events.jsonl     append-only: one line per decided area at each approval
  rules.json       rules: pending, or kept by the person
```

One event:

```json
{ "at": "2026-11-17T07:20:00Z", "project": "github.com/handlecusion/tokcat", "session": "tokcat-landing-page", "revision": "r1",
  "area": "hero", "decision": "landing-hero", "suggested": "split", "suggestedBy": "agent", "chosen": "centered",
  "offered": [
    { "option": "keep", "keep": true },
    { "option": "split", "pattern": "hero-split" },
    { "option": "centered", "pattern": "hero-centered" }
  ] }
```

An event holds catalog ids, option ids and the name of the project. It never holds labels, markup,
texts of the page or the words of a change request. The review listener writes it at the moment
the person presses Approve; no command of the agent can write one.

The project is named by the address of its git remote, without credentials, so that every checkout
and worktree of it is the same project. A folder that is no repository is named by a hash of its
path.

### What counts as a signal

| What the person did | Weight | Why |
|---|---|---|
| Chose an option that was not the suggested one | 2 | A correction: the strongest thing a click can say |
| Chose the suggested option | 1 | Weaker, because the mark itself pulls toward it |
| Kept the page as it is, or chose something over keeping it | As above, in this project only | "Leave it" says something about this page, not about the patterns in general |
| Approved again in the same session | Replaces the earlier events of that area in the session | The last word counts |
| Confirmed a rule ([below](#rules)) | 3 | Said in words and confirmed on purpose |

A signal is a pair: **chosen over not chosen**, for every other option that was offered with it.
One choice says each pair once, however many of the other options share a pattern. It is read at
two levels at once:

- **pattern:** `hero-centered` over `hero-split`;
- **trait:** where both patterns carry the same trait, its values: `intensity: none` over
  `intensity: subtle`. Motion patterns have `intensity` today. Layout patterns get traits
  (density, emphasis) later, and that is when taste starts to reach across decisions there too.

Signals fade: a weight halves every 180 days, so that taste can change.

### Scopes

| Scope | Evidence | Weight in ranking |
|---|---|---|
| **This project** | Every signal from the same project, from the first one | 1.0 |
| **General** | A pair whose weight, summed over other projects, is 3 or more **and** comes from at least 2 projects | 0.5 |
| Seen elsewhere, not repeated | A pair from one other project, or below 3 | 0. Listed by `picky-eater taste`, not used |

That is the rule the third decision asks for: the same project counts most and counts at once; what
keeps repeating becomes general; one choice in one other project is not yet a preference.

Trait pairs become general sooner than pattern pairs, because every motion decision adds to the
same pair. "No motion over subtle motion", chosen in four areas of two projects, is general, and
from then on shifts every motion decision in every project. That is the general recommendation.

### Ranking

For an area with the offered options O, the score of an option c is

```
score(c) = Σ over the other options o in O:
             1.0 × ( project(c over o) − project(o over c) )
           + 0.5 × ( general(c over o) − general(o over c) )
```

summed over the pattern pair and the trait pairs. `propose` computes it for every area:

- No evidence, or a lead of less than 0.75 over the agent's suggestion: the agent's mark stays,
  with the agent's `because`. This is what happens on a first run.
- A lead of 0.75 or more: the mark moves, and `because` is written from the evidence: "You chose
  this over "Text on the left" in this project", "…in 3 projects", "You usually choose no motion
  over subtle motion: 4 times in 2 projects". One plain choice in the same project is enough for
  about ten weeks; a choice against the mark for about eight months.

The moved mark is written next to the revision (`advice.json`), not into the board: the draft and
the published board stay as the agent wrote them, and the digest a person approves covers the
content, not the advice. `propose` prints which marks moved.

Taste only moves the mark among options that are on the board. It never removes an option, never
brings back a candidate the gate rejected, and never touches the floor (reduced motion, keyboard,
contrast). `recommend` also prints it before the board is drawn, so that the agent can draw the
likely choice first; what the agent then offers is still up to the catalog's conditions.

### Rules

A change request is a correction in words ("too much movement", "the cards feel cramped"). It is
not turned into a weight automatically, because a reason that was guessed gets applied where it
does not fit.

1. The agent may propose a rule from a request:
   `picky-eater taste propose --rule "No motion on product screens" --from <request>`.
2. A proposed rule is **pending**. It appears at the top of the History panel of the review page
   with "Keep for this project", "Keep for all projects" and "Discard".
3. Only a kept rule counts. Like approval, keeping a rule is a click by the person: the review
   listener refuses the command line's token for it.

A rule is a sentence for the agent, printed by `recommend`. If it names patterns
(`prefer` / `over`), it also counts as a signal of weight 3.

### Control

| Command | Does |
|---|---|
| `picky-eater taste` | What is known, per scope, with the count and the projects behind each line |
| `picky-eater taste --forget <project, pattern or rule>` / `--forget-all` | Removes it |
| `picky-eater taste --off` / `--on` | This project neither reads nor writes taste (`"taste": false` in `.picky-eater/workspace.json`) |
| `PICKY_EATER_TASTE=off` | The same for one run |

Nothing leaves the machine. The files are plain JSON and can be read, edited or deleted.

## Changes to the formats

| Where | Change |
|---|---|
| Catalog | Category `motion`; a `motion` block on its patterns |
| Board | `areas[].decision`, `areas[].rejected`, `options[].because` |
| Board | Cut `steps`: `hover`, `key` |
| Revision folder | `advice.json`: where earlier choices moved the mark, and why. Not part of the digest |
| `.picky-eater/workspace.json` | `"taste": false` |
| `~/.picky-eater/taste/` | `events.jsonl`, `rules.json` |
| Answer key | Per area in which a motion was offered: `motion` and `reduced` |
| Mockup kit | `pk-m-*` classes |

## Status

| # | Goal | State | Checked by |
|---|---|---|---|
| 1 | Motion in the catalog: category, 20 patterns, 10 decisions, 15 references; the gate in the skill; the build checks the motion rules | Done | `tests/unit/catalog.test.ts`; every pattern's CSS parsed in Chrome |
| 1 | `validate` warns about the floor | Done | `tests/unit/motion.test.ts` |
| 2 | Motion in the review: play mark, what appears plays by itself, Replay, Slow, Reduced, `hover` and `key` steps, kit classes | Done | `tests/e2e/motion.spec.ts` (Chromium) |
| 3 | `inspect --profile`, `recommend`, `decision`, `because`, `rejected`, the note behind the mark | Done | `tests/unit/recommend.test.ts`, `tests/integration/motion-page.test.ts`, `tests/e2e/motion.spec.ts` |
| 4 | Taste: events at approval, scopes, the mark at `propose`, rules, the `taste` command | Done | `tests/unit/taste.test.ts`, `tests/integration/taste.test.ts`, `tests/e2e/motion.spec.ts` |
| 5 | Motion in `implement` and `check`, with a reduced-motion pass | Done | `tests/unit/motion.test.ts`, `tests/integration/motion-page.test.ts` |

## Open questions

| Topic | Position so far |
|---|---|
| `@starting-style`, `interpolate-size`, `::details-content`, cross-document view transitions and `animation-timeline` are not in every browser | Every pattern degrades to "it appears at once". The review does not yet say when the person's browser does not show a motion they are choosing |
| Frequency of a moment | Taken from the kind of page, which is a guess from its markup. The agent corrects it with `--frequency`. A page that is both read and worked with needs a frequency per area, which the board does not have |
| The page profile | Found by rule from markup and style sheets: buttons without a pressed style, `details`, tab lists, groups of like items. A press that a script answers, or a component library that draws its own tabs, can be missed or misread |
| Traits beyond motion | Only motion patterns carry a trait (`intensity`). Density and emphasis on layout patterns would let taste reach across layout decisions too |
| A team that shares a repository has several people's taste | Taste is personal and is never committed. Whether a team can commit shared rules is not decided |
| The mark pulls toward the suggested option | Choosing it weighs half as much as overriding it. Whether that is enough shows only with real use, as do the other numbers: the lead of 0.75, the half-life of 180 days, 3 from 2 projects |
| `Replay` takes an area out of the rendering for a moment | A framework that watches its elements sees nothing of it in the tests. An app that reacts to an element being hidden (an observer that loads or unloads) could |
| Examples marked "not re-checked" in the motion patterns | 11 of 34. Four patterns (`crossfade`, `scroll-reveal`, `attention-pulse`, `shared-element-morph`) have no checked example yet. To be opened and confirmed, or replaced |
