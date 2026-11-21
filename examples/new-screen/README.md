# Example: a new screen

A complete board for a workshop sign-up page: six areas, two or three options each, and six cuts
(top, scrolled, empty form, error, filled in, sent). Two of the areas only exist inside the
sign-up form and only in one cut each: the error message and the confirmation.

## Try it

From any folder (a scratch folder is fine), with the repository checked out at `<repo>`:

```sh
alias pe="node <repo>/skills/picky-eater/scripts/picky-eater.mjs"

pe new --title "Workshop sign-up" --from <repo>/examples/new-screen/board
pe validate
pe propose
pe preview --open
```

Then, in the page that opens:

1. Point at a dot and pick an option. The sketch of that area becomes the finished design.
2. Scroll the page: the top bar stays in place and shrinks.
3. Choose the sign-up form, click **Empty form** in the strip, and press *Save my seat* inside the
   page with the fields empty. The page moves to the error cut, where a new dot appears.
4. Type a name and an email into the page and press the button again.
5. Switch to **Phone**.
6. When every area is chosen, press **Approve**. `pe status` now lists what was approved.

`pe preview --stop` stops the review page.

## What is in the board

| File | Purpose |
|---|---|
| `board/board.json` | Areas, options and cuts |
| `board/frame.html` | The page: places of the areas, and the parts that are not a choice |
| `board/styles.css` | The shared look |
| `board/areas/<area>/sketch.html` | The rough drawing of an area |
| `board/areas/<area>/<option>.html` | One small fragment per option |
| `board/assets/room.svg` | A picture, inlined when the page is drawn |
