# Choosing what to offer

The catalog (`pe patterns`) is researched from established UI/UX books and public design systems:
146 patterns in eight categories (`layout`, `navigation`, `input`, `action`, `content`, `feedback`,
`overlay`, `motion`) and 50 recurring decisions. Use it so that the options you draw are the ones the
literature says are in play, each built by its rules.

## From a part of the page to its options

1. **Name the question, not the widget.** "How do people turn notifications on and off" rather than "a toggle". `pe patterns --find "on off"` finds the decision `on-off-setting`.
2. **Read the decision.** Each candidate has the condition under which it wins:
   ```
   on-off-setting — Turn one thing on or off
     - switch: The change takes effect immediately, with no Save button
     - checkbox: The change is saved together with a form
     - toggle-button: The state belongs to the current item and sits in a toolbar
   ```
3. **Drop candidates the product rules out.** If the page has a Save button, a switch is wrong: do not offer it. An option the catalog says to avoid here is not an alternative, it is a mistake drawn nicely.
4. **Offer what is left, and suggest the one whose condition fits best.** If only one candidate fits, this is not an area: put that pattern into the frame.
5. **No decision fits?** Look at a pattern's `alternatives` (`pe patterns card-grid`), or search by purpose.

## Reading a pattern

```
pe patterns hero-split
```

| Part | Use |
|---|---|
| Use when / Avoid when | Decide whether it is a candidate at all |
| Rules | Draw the option by them, and put the ones the drawing cannot show into `build` |
| Alternatives | The other options of the same area |
| Seen in | Real products to look at when unsure how it should look |
| Mockup snippet | The starting markup, with kit classes |

## What makes a good set of options

- **Different in structure.** Card grid, list and table are three options. Three card grids with different corner radii are one.
- **Same content.** Use the same items, words and amounts in every option of an area.
- **Honest.** Do not weaken the options you would not pick. If one is clearly wrong for this product, leave it out.
- **Page-level first.** Layout decisions (`organize-settings`, `landing-hero`, `show-a-collection`, `desktop-navigation`) change more than control decisions. Spend areas on them first.
- **Few.** Three to six areas. More than eight is tiring: `validate` warns.

## Rules that the drawing cannot show

A mockup has no keyboard behavior, no timing and no announcements. When a pattern's rules cover
those (focus order in a dialog, `role="alert"` on an error summary, undo within seconds), write
them into the option's `build` note. They are part of what was approved.

## Motion

Where a page moves is a choice like any other, and "it does not move" is always one of the
options. `pe patterns --category motion` lists the motions; their decisions (`press-feedback`,
`open-in-place`, `overlay-entrance`, `move-selection`, `content-entrance`, …) are the questions.

Look for the moments where something changes: a press, a section that opens, a highlight that
moves to another tab, an overlay that appears, content that arrives. On a running page
`pe recommend` finds them and applies the first three questions for you; it prints what to offer
and what to leave out at each. A candidate is offered only if it passes all four questions, in
this order:

1. **How often does a person meet this moment?** Each motion says how far it goes (`Right up to`):
   `constant` (a hundred times a day: shortcuts, the command palette, core navigation), `frequent`
   (tens of times a day), `occasional` (dialogs, drawers, settings), `rare` (a landing page, a
   first visit, a success moment). A moment met more often than the pattern allows gets no such
   option. Anything started from the keyboard all day gets none at all.
2. **What is it for?** Name one: feedback, where something came from (spatial), what changed
   (state), bridging a jump (continuity), leading the eye (attention), explaining, or delight.
   Delight is only for rare moments. "It looks good" is not a purpose.
3. **Does it fit its time?** Stay inside the pattern's duration. Most interface motion is under
   300 ms; only panels, page changes and marketing pages take longer.
4. **Does it get in the way?** Nothing moves for style on a screen where people read or work with
   data, and nothing waits for a motion before it can be used.

Then:

- **Few.** One or two motion areas on a page, three on a landing page. A page where everything
  moves has no emphasis left.
- **CSS only.** A transition or keyframes, in a `css` patch on an existing page or in the shared
  stylesheet of a new screen. Start from the pattern's "CSS to start from" and keep its
  `prefers-reduced-motion` rule. What needs a script to move (dragging, springs that follow the
  pointer, numbers that count) is not offered yet.
- **It has to play in the review.** On an existing page the page's own behavior changes the state
  and the patch only adds the motion. On a new screen there are no scripts, so the state must
  change by itself: `:hover`, `:active`, `:focus-within`, `:checked`, `details[open]`.
- **Say what moves in the label** ("Answers open smoothly", "The highlight slides"). A thumbnail
  stands still and carries a small play mark; the person sees the motion by pointing at the option
  and using the page. What plays when something appears (keyframes, `@starting-style`) plays by
  itself when the option is pointed at, and again on **Replay**. **Slow** and **Reduced** in the
  top bar show it at a quarter of its speed and as people get it who asked for less motion.
- **On a new screen the kit has the common ones:** `pk-m-press`, `pk-m-lift`, `pk-m-fade`,
  `pk-m-rise`, `pk-m-stagger` (on the parent) and `pk-m-expand` (on a `details`). The option with
  the motion is the same markup with one class more.
- **Write the numbers into `build`:** properties, duration, curve, and what reduced motion gets.
  If the project already has duration or easing tokens, name those instead of new values.
- **The other option is the page as it is:** `keep` on an existing page, the same markup without
  the motion on a new screen (`"pattern": "instant-change"`).

## What the person chose before

Choices are remembered on the person's machine, across projects, when they approve
(`pe taste` shows what is known). You do not have to do anything for that, and you cannot write
to it. It comes back in two places:

- `pe recommend` prints "earlier choices speak for …" under a decision. Draw that option with
  care; whether you also suggest it is still decided by the catalog's conditions.
- When a draft is published, the suggested mark of an area moves to another option if the
  person's earlier choices speak clearly for it. `pe propose` says so ("Suggested mark moved by
  earlier choices: hero → centered"). Your draft stays as you wrote it.

The same project counts in full and at once. Other projects count for half, and only once a
choice has repeated there. A choice against the mark counts double.

**Rules.** When the person asks for a change in words that say something about how they choose in
general ("too much movement", "I never want centered text"), you may propose a rule after
answering the request:

```
pe taste propose --rule "No motion on screens that are used all day." --from q2
pe taste propose --rule "Text on the left in a hero." --prefer hero-split --over hero-centered
```

A proposed rule is pending and counts for nothing. The person keeps or discards it in the review
page, under History; tell them it is there. Propose only what they said. Do not invent a reason,
and do not propose a rule from a single choice: choices are counted already.
