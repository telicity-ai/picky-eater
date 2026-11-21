# Example: a React app

**Switchback** is a made-up product: it schedules shifts for volunteer trail-maintenance crews.
This folder is a small, ordinary Vite + React + TypeScript app, and a board over its Settings
page. The page is a realistic first version: it works, its tests pass, and it looks like
something a busy developer shipped before a design review. Sections run into each other,
"Delete account" sits right next to "Save", and the days of the week are a row of checkboxes.

It shows what a board over an existing page does in an app that redraws itself: the options stay
in place while React re-renders the form, while you move to another page of the app and back,
and through hot updates. All names, emails and phone numbers are invented. The app makes no
network requests.

## Try it

With the repository checked out at `<repo>`, in two terminals:

```sh
# 1. the app, as you would run your own
cd <repo>/examples/react-app
npm ci
npm run dev                                   # http://localhost:5173/
```

```sh
# 2. the review, from the same folder
alias pe="node <repo>/skills/picky-eater/scripts/picky-eater.mjs"

pe inspect --url http://localhost:5173/       # the parts of the page, each with its component and file
pe new --title "Switchback settings" --from board
pe validate                                   # also holds the board against the running page
pe propose
pe preview --open
```

Then, in the page that opens:

1. It is the real app: type into a field, tick a day, press **Save changes**.
2. Point at the dot of the form. *Each section in its own card* and *Titles on the left* are
   styles laid over the app; nothing of it is in the source.
3. Choose *A button for each day*, then tick days in the page. React redraws the checkboxes; the
   buttons stay buttons.
4. Choose *In a section of its own, in red* for Delete account. The real button is moved into a
   new section; press it, and the app's own confirmation still appears.
5. Press **Save changes** in the page. The strip under the page moves to **Just saved**, and the
   message gets a dot of its own. Choose *"Changes saved" with a check mark* and save again:
   React removes the message and adds a new one, and the option is on the new one.
6. Go to **Shifts** in the app and back to **Settings**. React builds the whole page again; your
   choices are on it.
7. Edit `src/pages/SettingsPage.tsx` while the review is open. The hot update arrives in the
   page and the options stay.
8. When every area is chosen, press **Approve**. `pe implement` then measures the approved look
   and prints what to build, with the component and file that draw each area:

   ```
   delete (Where Delete account lives): danger-zone — In a section of its own, in red [confirmation-dialog]
       build: Move Delete account out of the save row into a "Delete account" section after it, …
       source: src/pages/SettingsPage.tsx  <SettingsPage>
       on the running page ".settings-actions .button--secondary" is drawn by: <Button> src/components/Button.tsx
   ```

`pe preview --stop` stops the review page. Stop the app with Ctrl+C. The session is stored in
`.picky-eater/` in this folder; delete that folder to start over.

## What is in the board

`board/board.json` is the whole board: there are no other files.

| Area | Options | How they are shown |
|---|---|---|
| How the sections are set apart | lines · cards · titles on the left | `css` |
| Days you can volunteer | checkboxes · a button for each day | `css` on the real checkboxes |
| Notification choices | one list · two columns · lead time first | `css`; `move` of a component's element |
| Where Save sits | end of the form · a bar that stays at the bottom | `css` |
| Where Delete account lives | next to Save · a section of its own | `insert` a section, `move` the real button into it, `css` |
| Message after saving (only in the cut "Just saved") | green text · "Changes saved" with a check mark | `set` the text of an element React adds and removes, `css` |

The cut **Just saved** is reached by `steps`: wait for the form, press Save, wait for the message.

## The app

```
src/
  main.tsx, App.tsx      App shell: top bar, Shifts / My hours / Settings (state-based navigation)
  api/settingsApi.ts     A mock API with an in-memory store and validation; answers after about 350 ms
  components/            Button, TextField, Select, Checkbox, FormSection (+ CSS)
  pages/SettingsPage.tsx The page the board is drawn over
  styles/tokens.css      Design tokens (CSS custom properties)
```

```sh
npm test           # the app's own tests (Vitest, Testing Library)
npm run typecheck
npm run build
```

The app is also what `tests/stacks` runs the tool against, next to its 14 framework fixtures:
`npm run test:stacks -- react-app` from the repository root.
