# Pattern catalog

The catalog is the design knowledge picky-eater gives a coding agent when it draws the options of
a storyboard: which layouts and controls exist, when each one is the right choice, the rules for
building it well, and where it can be seen in real products. It is researched from established
UI/UX books and public design systems. Every entry names its sources.

The files here are the single source of truth. The build bundles them into the CLI
(`picky-eater patterns`) and generates [docs/patterns.md](../docs/patterns.md) from them.

```
catalog/
  references.json          books and design systems that entries cite
  decisions.json           recurring design questions and the patterns that answer them
  patterns/<category>.json one file per category
```

## Pattern

```jsonc
{
  "id": "switch",                         // lowercase kebab-case, unique across all files
  "name": "Switch",                       // the name most people use
  "aka": ["toggle", "toggle switch"],
  "what": "A control that turns one setting on or off, and takes effect at once.",
  "useWhen": ["The change applies immediately, without a Save button"],
  "avoidWhen": ["The choice only applies after the form is submitted (use a checkbox)"],
  "rules": ["Label the setting, not the state: 'Wi-Fi', not 'Turn Wi-Fi on'"],
  "examples": [
    { "who": "Apple iOS", "where": "Settings rows such as Wi-Fi and Bluetooth",
      "url": "https://developer.apple.com/design/human-interface-guidelines/toggles", "verified": true }
  ],
  "sources": [{ "ref": "cooper-2014", "where": "ch. 21, Controls" }],
  "alternatives": ["checkbox", "toggle-button"]
}
```

| Field | Rule |
|---|---|
| `what` | One sentence a person without design training understands |
| `useWhen`, `avoidWhen` | Conditions that can be checked against a product, not taste |
| `rules` | Concrete and buildable: sizes, states, wording, keyboard and screen-reader behavior |
| `examples` | Real products. `verified: true` only if the URL was opened and shows the pattern |
| `sources` | `ref` is an id in `references.json`; `where` is a chapter or pattern name. No invented page numbers or quotations |
| `alternatives` | Ids of patterns that answer the same question. They become the options of an area |

Categories: `layout`, `navigation`, `input`, `action`, `content`, `feedback`, `overlay`, `motion`.

## Motion pattern

A pattern in `patterns/motion.json` also has a `motion` block: the part that can be checked and
built. No other category has one.

```jsonc
"motion": {
  "trigger": ["press"],          // press, hover, state, open, enter, scroll, navigate, ambient
  "purpose": "feedback",         // feedback, spatial, state, continuity, attention, explanation, delight
  "upTo": "frequent",            // the most frequent use at which it is still right:
                                 // constant > frequent > occasional > rare
  "intensity": "subtle",         // none, subtle, moderate, expressive
  "duration": [100, 160],        // shortest and longest, in milliseconds
  "easing": "cubic-bezier(0.22, 1, 0.36, 1)",
  "properties": ["transform"],   // what changes
  "reduced": "No scale; the pressed color still changes.",
  "css": ".btn { transition: … }\n@media (prefers-reduced-motion: reduce) { … }"
}
```

| Rule | Checked by the build |
|---|---|
| Plain CSS only: transitions and keyframes, nothing that needs a script | The CSS passes the same checks as a board's stylesheet |
| CSS that moves, scales or turns something has a `prefers-reduced-motion` rule; a fade or a change of color does not need one | Yes |
| `delight` and `expressive` are only for `"upTo": "rare"`; what plays by itself (`ambient`) is never for frequent use | Yes |
| Every decision that offers a motion also offers not moving: `instant-change`, or a pattern of another category | Yes |
| `intensity: "none"` (the pattern `instant-change`) has no duration, properties or CSS | Yes |
| Values come from a source: duration ranges and curves are those of the cited guidelines, not taste | No: review |

Write the CSS for the simplest markup that shows the motion, with class names that say what the
element is (`.btn`, `.card`, `.panel`). An agent adapts the selectors to the page.

## Decision

A decision is a question that comes up again and again, with the patterns that answer it and the
condition under which each one wins.

```jsonc
{
  "id": "on-off-setting",
  "question": "Turn one thing on or off",
  "candidates": [
    { "pattern": "switch", "pick": "The change takes effect immediately" },
    { "pattern": "checkbox", "pick": "The change is saved together with a form" }
  ],
  "sources": [{ "ref": "nng-toggle-2020", "where": "Toggle-Switch Guidelines" }]
}
```

## Reference

```jsonc
{ "id": "cooper-2014", "kind": "book", "authors": "Alan Cooper, Robert Reimann, David Cronin, Christopher Noessel",
  "title": "About Face: The Essentials of Interaction Design", "edition": "4th", "year": 2014, "publisher": "Wiley" }
```

`kind` is `book`, `design-system` or `article`. Design systems and articles need a `url`.

## Adding an entry

1. Add it to the right file, with at least one source and one example.
2. Run `npm run build`. It validates the catalog and regenerates `docs/patterns.md`.
