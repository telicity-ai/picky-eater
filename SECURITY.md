# Security

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://github.com/telicity-ai/picky-eater/security/advisories/new)
for this repository. Do not open a public issue for security problems.

Include the affected version (`node <skill folder>/scripts/picky-eater.mjs --version`), your OS and
Node.js version, and steps to reproduce. We aim to acknowledge reports within 7 days. Please allow
us reasonable time to release a fix before public disclosure.

Supported versions: the latest released minor version.

## Security model

picky-eater runs on the developer's machine, inside their project, driven by a coding agent. It
has no hosted backend, no accounts and no telemetry, and makes no network requests of its own.

Four parties are involved, with different trust:

| Party | Trust |
|---|---|
| The person reviewing in the browser | Makes the decisions. Only they can choose, ask for changes and approve. |
| The coding agent | Writes drafts through the CLI. Its mockups and patches are treated as untrusted. |
| The user's own app, on boards over an existing page | Runs its own code. It is shown, but it has no say: it cannot choose, approve, or reach the review page. |
| Everything else on the machine and in the browser (other sites, other local servers) | Not trusted at all. |

### What is protected, and how

| Threat | Protection |
|---|---|
| Another website reading or changing the review (CSRF, cross-origin reads) | There is no ambient credential. The page sends a token in the `X-PE-Token` header with every request; a state-changing request also needs `Content-Type: application/json`, an `Origin` equal to the server's own, and `Sec-Fetch-Site: same-origin` when the browser sends it. |
| Another server on 127.0.0.1 receiving the credential | No cookie is used, because cookies are shared by every port of a host. The token travels in the link's fragment, which is never sent to a server, and is kept in `sessionStorage`, which is scoped to the origin including the port. |
| DNS rebinding | Every request's `Host` header must be `127.0.0.1:<port>`, `localhost:<port>` or `[::1]:<port>`. |
| Other machines on the network | The server binds to 127.0.0.1 only. |
| Other local users or processes without the link | Every API route except `/api/health` needs a 256-bit random token, compared in constant time. Without it `/api/health` reports only the name and version. The file that holds the tokens is written with mode 0600 and ignored if anyone else can read it. |
| A mockup that runs code or loads something | Three layers. `validate` refuses scripts, event-handler attributes, frames, `<object>`, `<link>`, `<base>`, `@import`, remote URLs and links that leave the page. The review page sanitizes every fragment again with the browser's own parser before it is used. The result is drawn in `<iframe sandbox="allow-same-origin">`, without `allow-scripts`, under a Content Security Policy of `default-src 'none'` that allows only inline styles and inlined images. |
| A revision changed after it was published | Every file of a revision is recorded with its SHA-256. The server refuses to serve a revision whose files no longer match. |
| Approving something other than what is on screen | An approval carries the revision number, the revision digest and the exact choices the page showed. The server refuses it if any of them differs from the stored state, or if an area on the page has no choice. |
| The agent approving on the person's behalf | There is no approve command. The CLI's own token can read state and stop the server; the API refuses choices, change requests and approval made with it. |
| The agent deciding what the person likes | What a person chose is written by the review listener at the moment of an approval, never by a command. The agent can propose a rule about their taste; it stays pending and counts for nothing until the person keeps it in the review page, and the API refuses to keep one with the CLI's token. What is remembered only ever moves the suggested mark among the options that are on the board. |
| Path traversal | The browser never sends a path. Draft files are read through a resolver that refuses absolute paths, `..`, hidden files and symlinks that leave the draft folder. |
| Untrusted text in the review page (XSS) | Titles, labels and request text are inserted as text, never as HTML. The page's own CSP allows scripts only from its own origin. |
| Oversized requests | Bodies over 64 KiB are refused. Header and request timeouts are set. |
| A forgotten server | The preview stops after two hours without requests, and with `picky-eater preview --stop`. |

### Boards over an existing page

The user's app is shown from a second listener (the *stage listener*) on its own port, so that the
app and the review page are **different origins**.

| Threat | Protection |
|---|---|
| The app choosing or approving | The app and the review page only exchange `postMessage` messages. The review page accepts them only from the frame it created and only from the stage origin, and uses them only to draw: where the areas are, where the dots go, a copy of the page for thumbnails. Dots are clamped to the frame and unknown areas are dropped. A choice or an approval is only ever created by a click on an element of the review page itself. |
| The app reading the review page, its token or its storage | Different origin: the browser refuses. The token is in `sessionStorage` of the review origin and is sent only by the review page's own requests. The API has no CORS headers and refuses requests with another `Origin`. |
| The app navigating or replacing the review page | The frame is sandboxed without `allow-top-navigation`. |
| Something other than the review page driving the script in the app | The script obeys only messages whose `origin` is the review page's and whose source is its parent window. The stage listener lets only the review origin frame the app (`frame-ancestors`), replacing whatever framing rules the app sends. |
| The stage listener as an open proxy | It forwards only to the address in the board, which must be `localhost`, `127.0.0.1` or `[::1]`. It binds to loopback and checks the `Host` header like the review listener. |
| A copy of the app running code in the review page | Thumbnails are copies of the app's markup and styles. Scripts, frames, links, event handlers and addresses outside the app are removed, and each copy is drawn in a frame that cannot run scripts, under a policy that loads only images and fonts from the app. |
| A patch that carries code or reaches out | `validate` refuses scripts, event handlers, frames and remote URLs in inserted markup, CSS and attributes; the patch engine strips them again before anything is inserted. A level-4 `script` is refused if it names a way to load, send or store (`fetch`, `XMLHttpRequest`, `WebSocket`, `location`, storage, cookies, `eval`, …). |
| A service worker of the app serving pages around the stage listener | Registration is refused in the preview unless the board says `"serviceWorker": "allow"`. |
| The script in the app changing how the app works | It adds nothing to the app's own code and touches the page only through patches, which are taken back. One thing reaches further: while an option that moves or wraps an element is on the page, the page's `removeChild`, `insertBefore`, `replaceChild` and `remove` first put that element back where the app left it, so that a framework that wants it finds it. This is only in the preview, only while such an option is shown, and a reload removes it. |
| A script tag left behind (`"attach": "tag"`) | Only `picky-eater attach` writes it, marked, into a file the agent names inside the project; `picky-eater detach` removes it; `status` reports it as long as it is there. It loads only from 127.0.0.1 and does nothing unless the page is framed by the review. |

### Looking at a page without the person: `inspect`, `validate`, `implement`, `check`

These commands start a Chrome, Edge or Chromium that is already installed, headless, with a
temporary profile that is deleted afterwards. `inspect` and the page check of `validate` read the
running page (its parts, and the component and source file each belongs to); `implement` and
`check` measure it. The profile is empty: a page behind a sign-in shows its sign-in screen there,
and no session of the person is ever used.

For such pages, `signin` signs that browser in once: it opens a page of the development server,
plays steps the agent gives it (fill in, click) or only opens a one-time link, and keeps the
cookies for this machine and the local storage of the page it ends on. The later commands start
with them.

| Threat | Protection |
|---|---|
| The browser reaching the network | It is started with background networking, updates and sync off, and with host resolution limited to `localhost`, `127.0.0.1` and `[::1]`. It opens only the approved mockup (as markup, never from a server) and pages of the project's development server on loopback. |
| A shell that cannot start a browser | If the browser cannot start (an agent's command sandbox), it is started again as a single process without its own sandbox (`--no-sandbox --single-process`). That only happens after a normal start failed, and the browser still opens nothing but the mockup and loopback pages. |
| What is read from a framework | Which component drew an element is read from what React, Vue, Svelte, Astro and Angular leave on a page in development. Those values are used as text in the output (a component name, a file path); a component name is looked up in the project's sources by a fixed pattern, and nothing read from a page is executed or used as a path to write to. |
| A page under test changing the result | The page is only read, and driven through the steps of a cut. Measurements go to files under `.picky-eater/`; nothing a page returns is executed. |
| The agent bending the result | The answer key is taken once per approval and kept. `report` refuses while differences remain unless each is declared, and every check, report and deviation is in the event log. An agent can still edit those files; see the limits below. |
| Pictures of the pages | Served by the review listener only with the token, by a fixed file-name pattern, from the folders of the current approval. |
| The person's own session | Never read. `signin` works in the headless browser's own empty profile; nothing is copied from the person's browser, and the stage listener does not see, keep or replay what the person's browser sends. In the review the person signs in themselves, inside the preview. |
| The saved sign-in | It is the session of the account the agent was given for development, which the agent could use anyway. It is one file, `.picky-eater/runtime/signin.json`, readable by the user only, in a folder that picky-eater's `.gitignore` keeps out of the repository; cookies of hosts other than this machine are not kept, and `signin --clear` deletes it. The password typed by the steps is not written anywhere. |
| A listener that hands out a session | The stage listener does not attach the saved sign-in to requests. If it did, any page open in the person's browser could use the app as that account through it. |

### Limits

- **The approval gate is a process control, not a sandbox.** It makes sure that the person looked
  at exactly what gets built, and it gives the agent no way to approve through the product. An
  agent with shell access to the same machine can still write files or drive a browser; nothing
  that runs with the agent's permissions can make that impossible. The skill forbids it, and
  every approval is recorded in the session's event log.
- **`allow-same-origin` without `allow-scripts`.** The mockup frame shares the review page's
  origin so that the page can read its layout. This is safe only because the frame cannot run
  scripts; the sanitizer and the frame's CSP are there in case a browser ever disagrees. The
  browser tests plant hostile markup in a published revision and check, in Chromium, that nothing
  runs and nothing is requested.
- **Mockup content is shown to the person as written.** A draft can contain misleading text. It
  cannot act on its own.
- **A patch script runs in the user's app.** A level-4 `script` is code written by the agent that
  runs in the app's page, with the app's own rights, while it is previewed or chosen. The words it
  may not use are checked as text, which a determined author can get around. It cannot reach the
  review page, and the person sees such options marked "Approximate"; but treat a board from a
  source you do not trust like code from that source.
- **The app can mislead, not decide.** The app draws its own page and reports where its areas are.
  A hostile app could show something else than its real page, or move a dot. It cannot pick an
  option or approve: that takes the person's click in the review page.
- **A saved sign-in is a credential.** Whoever can read the user's files can read
  `.picky-eater/runtime/signin.json` and use the development account it belongs to. Use an account
  that only exists for development, never a real person's.
- **Remembered choices are a file in the user's home.** An agent with shell access can read and
  write `~/.picky-eater/taste/` like any other file of the user, and so could make the suggested
  mark move. It cannot make a choice or an approval that way: the mark is advice, the person still
  clicks. `picky-eater taste` shows everything that is remembered and where it comes from.
- **The stage listener has no token.** Whoever can reach the user's development server on this
  machine can reach the same pages through the stage listener. It adds no access that was not
  there.

### Data handling

Everything about a page is stored as plain files under `.picky-eater/` in the project: drafts,
revisions, choices, change requests, approvals and an event log. `runtime/` (tokens, port, process
id) is git-ignored. The skill tells agents to use made-up content in mockups and not to open
secrets.

One thing is stored outside the project, because it is about the person and not about the
project: what they chose before, in `~/.picky-eater/taste/` (`PICKY_EATER_HOME` moves it), readable
by the user only. `events.jsonl` has one line per decided area of each approval: the time, a name
for the project (the address of its git remote without credentials, or a hash of its path), the
session, and the ids of the options and catalog patterns that were offered, suggested and chosen.
`rules.json` has the rules a coding agent proposed and the person kept. No label, markup, text of
a page or wording of a change request is written there, and nothing is sent anywhere.
`picky-eater taste --forget-all` deletes both files; `picky-eater taste --off` makes a project
neither read nor write them, and `PICKY_EATER_TASTE=off` does the same for one run.

### Dependencies

The shipped CLI is one file with no runtime dependencies. It bundles
[zod](https://github.com/colinhacks/zod) (MIT); see
`skills/picky-eater/THIRD_PARTY_NOTICES.md`. Build and test tools are development dependencies
and are not shipped.
