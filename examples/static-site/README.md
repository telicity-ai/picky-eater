# Example: a page that exists

A small site in plain HTML, CSS and JavaScript ("Harbor Bikes"), a development server for it, and
a board over its home page. The site has what a preview must not break: a sticky header that gets
lower once the page is scrolled, steps that rise into place when they scroll into view, plan
buttons with listeners, and a form that checks itself. Its server adds what real development
servers add: a hot-reload WebSocket, a cookie, a Content-Security-Policy that forbids framing, and
a service worker.

## Try it

With the repository checked out at `<repo>`, in two terminals:

```sh
# 1. the site, as you would run your own
node <repo>/examples/static-site/server.mjs            # http://127.0.0.1:4175/
```

```sh
# 2. the review, from any folder (a scratch folder is fine)
alias pe="node <repo>/skills/picky-eater/scripts/picky-eater.mjs"

pe new --title "Harbor Bikes" --from <repo>/examples/static-site/board
pe validate
pe propose
pe preview --open
```

Then, in the page that opens:

1. It is the real site: scroll it, and the header gets lower and the steps under "How it works"
   rise into place. The footer says "Development server: connected · cookie set".
2. Point at the dot of the top bar. The options are small copies of the bar. Point at one: the
   real page shows it. Move away: it is gone again. Click one to keep it.
3. Open the plan cards. *The week plan comes first* moves the real card: press its **Choose**
   button in the page, and the site's own script still answers. *A switch between renting and
   subscribing* is marked **Approximate**, because its behavior comes from a short script; the
   switch works in the page.
4. Choose *The week plan stands out*: a new area appears on the week card (a label for it).
5. Click **Sent blank: error** in the strip. The page is opened afresh and the empty form is sent
   for you; the error message gets its own dot. Go back to **Top**, scroll to the form and send it
   empty yourself: the strip follows you.
6. Switch to **Phone**.
7. When every area is chosen, press **Approve**. `pe status` lists what to build and where.

`pe preview --stop` stops the review page. Stop the site with Ctrl+C.

## What is in the board

`board/board.json` is the whole board: there are no other files. Each area names an element of the
page (`anchor`), where it comes from (`source`) and its options. One option per area keeps the
page as it is; the others are patches:

| Area | Option | Patch |
|---|---|---|
| Top bar | Lower bar with smaller links | `css` only |
| Top bar | Reserve as a button on the right | `set` a class on an existing link, plus `css` |
| Main button of the top banner | "Reserve a bike" | `set` text and `href` |
| The free-helmet offer | A bar across the top of the page | `insert` outside the area (`"page": true`), plus `css` |
| Plan cards | The week plan comes first | `move` an existing card: its listener stays |
| Plan cards | A switch between renting and subscribing | `insert`, `css` and a `script` with its `undo` |
| Label on the week plan | "Most popular" | Exists only while the week plan stands out (`when`) |
| Message when the form is sent with a mistake | A box at the top of the form | Exists only in the error cut; `move` plus `css` |

The cuts say how each moment is reached on the real page: `steps` (scroll, fill, click) and the
element that shows the page is in that state (`seen`).

## Trying `"attach": "tag"`

For apps that do not work behind the preview's own address, the page can be framed from the
development server directly. The site's security headers forbid framing, so start it without them,
serving a copy that the tag may be written into:

```sh
cp -r <repo>/examples/static-site/site ./site
node <repo>/examples/static-site/server.mjs --plain --dir ./site
# in board.json: "base": { "kind": "live", "url": "http://127.0.0.1:4175/", "attach": "tag" }
pe attach --file site/index.html
pe propose && pe preview --open
pe detach        # when you are done
```
