# Installation

picky-eater is one folder, `skills/picky-eater/`, containing `SKILL.md`, reference files, agent
metadata and a self-contained CLI (`scripts/picky-eater.mjs`) that includes the review page and the
pattern catalog. Installing it means putting that
folder where your coding agent looks for skills. Nothing is installed into your application's
dependencies.

**Requirements:** Node.js 22 or newer on the machine where the agent runs, and a browser for the
review page. No accounts, API keys or network access are needed at runtime.

> Status: the install layout is the same as in version 0.1, for which every method was verified;
> see [compatibility.md](compatibility.md) for what has been re-checked with version 0.2.

## Option 1 — `npx skills` (recommended, all agents)

[`skills`](https://github.com/vercel-labs/skills) is an established, MIT-licensed installer for
Agent Skills. From your project root:

```sh
npx skills add telicity-ai/picky-eater --skill picky-eater -a claude-code codex cursor -y
```

This creates:

| Path | Used by |
|---|---|
| `.agents/skills/picky-eater/` | Codex, Cursor (and other clients that read `.agents/skills`) |
| `.claude/skills/picky-eater` → symlink to the folder above | Claude Code |
| `skills-lock.json` | the `skills` CLI (records the source; commit it if you want reproducible installs) |

Install for your user account instead of one project with `-g`. Choose fewer agents by
changing the `-a` list. The `skills` CLI itself needs a recent Node.js at install time (it
declares Node ≥ 22.20); set `DISABLE_TELEMETRY=1` to turn off its install telemetry. Remove the
skill with `npx skills remove picky-eater`.

## Option 2 — Claude Code plugin marketplace

Inside Claude Code:

```
/plugin marketplace add telicity-ai/picky-eater
/plugin install picky-eater@telicity-ai
```

Or from a shell (add `--scope project` to share it with your team through
`.claude/settings.json`):

```sh
claude plugin marketplace add telicity-ai/picky-eater --scope project
claude plugin install picky-eater@telicity-ai --scope project
```

Plugin skills are namespaced, so the skill appears as `picky-eater:picky-eater`. The marketplace
entry installs only the `skills/` folder (about 0.8 MB). Uninstall with
`claude plugin uninstall picky-eater@telicity-ai`.

## Option 3 — copy the folder

```sh
git clone --depth 1 https://github.com/telicity-ai/picky-eater.git /tmp/picky-eater
# Codex, Cursor and other Agent Skills clients:
mkdir -p .agents/skills && cp -R /tmp/picky-eater/skills/picky-eater .agents/skills/
# Claude Code:
mkdir -p .claude/skills && cp -R /tmp/picky-eater/skills/picky-eater .claude/skills/
```

For user-level installs use `~/.agents/skills/` or `~/.claude/skills/`. If you use Claude Code
and another agent in the same project, prefer one copy in `.agents/skills/` plus a symlink at
`.claude/skills/picky-eater` (what Option 1 creates) over two copies: there is one folder to
update. Cursor reads both `.agents/skills/` and `.claude/skills/`, so it may list the skill twice
either way (not verified).

## npm package

`package.json` defines a `picky-eater` binary that points at the same bundled CLI, and `npm pack`
produces a working package. **It is not published to the npm registry yet**, so `npx picky-eater` does not work today. You
do not need it: the skill folder already contains the CLI.

## After installing

Ask your agent for a page in plain words, for example:

> I need a sign-up page for our workshop. Show me options before you build it.

The agent runs the CLI itself. You can also run it directly from the project root, for example
to see where a session stands:

```sh
node .agents/skills/picky-eater/scripts/picky-eater.mjs status
```

The first session creates `.picky-eater/` in your project and nothing else. It writes
`.picky-eater/.gitignore` so that the runtime folder with the access tokens is never committed.
Whether you commit `.picky-eater/sessions/` (the drafts, your choices and approvals) is up to you;
delete the folder at any time without affecting your application.

## Updating

- Option 1: run the same `npx skills add …` command again, or `npx skills update`.
- Option 2: `claude plugin update picky-eater@telicity-ai`.
- Option 3: copy the folder again.

**Coming from version 0.1?** Version 0.2 is a rewrite with a different board format
(`schemaVersion` `2.0`). It does not read sessions made by version 0.1; delete the old
`.picky-eater/` folder when you no longer need them.

**Update every copy.** In Claude Code a personal skill (`~/.claude/skills/picky-eater`, often a
link to `~/.agents/skills/picky-eater`) takes precedence over a project skill of the same name. If
an older version is installed there, the agent follows the old instructions even in a project
that has the new one. Update the personal copy too, or remove it.

## Developing from source

See [CONTRIBUTING.md](../CONTRIBUTING.md). In short: `npm ci`, `npm run build`, `npm test`.
