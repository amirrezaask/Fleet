# Task documents and local board

## Layout

`.factory/` at the project root lists every task. Each task is one directory named
`<NNN>-<task-name>`, and the name never changes:

```text
.factory/
  001-account-recovery/
    TASK.md  INTENT.md  DESIGN.md  PLAN.md  DEBRIEF.md  REVIEW.md
    design/                                                   # design artifacts
      flow.md  mock.html  states.png
    evidence/                                                 # raw test output, gitignored
    worktree/                                                 # task worktrees, gitignored
    subtasks/
      001-email-token/                                        # subtask, same layout
      002-rate-limit/
  002-export-csv/
```

`<NNN>` is a three-digit, zero-padded sequence number (`001`, `002`, ...) so the
directories always list in creation order: a new task takes one more than the highest
number among its siblings in `.factory/` (or in the parent's `subtasks/`), starting at
`001`; numbers are never reused or renumbered. The rest of the name is lowercase ASCII
letters and numbers separated by single hyphens, unique among its siblings. Commands
may name a task by its full directory name, its number or its slug. Reuse existing tasks; never overwrite another task to resolve a
collision. Only directories inside `subtasks/` are subtasks, so `design/`,
`evidence/` and `worktree/` are never mistaken for them. Link between a task's own
files with relative paths (`design/mock.html`, `REVIEW.md`, `../DESIGN.md`).

A task starts from a request. Requests without a task yet wait in
[`.factory/backlog.md`](backlog.md), which is a file, not a directory, and the board
ignores it.

## Creating a task: one lock, one commit

Sessions run in separate worktrees and cannot see each other's new directories, so
every new top-level task (from `/factory intent` or `/factory next`) takes its number
on `master` in the main checkout, under a lock all sessions share. The main checkout is
the directory that holds the git common dir
(`dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`); call it `<main>`.

1. **Lock.** `mkdir <main>/.git/factory-claim.lock` (no `-p`; the directory is
   untracked). If it exists, wait a few seconds and retry; if it is older than ten
   minutes, a session crashed: remove it and retry. Always `rmdir` it when step 3 ends,
   including on failure.
2. **Check.** `<main>` must be on `master`; if not, release the lock and tell the user.
3. **Number and commit.** Pick `<NNN>-<slug>` (next free number in `<main>/.factory/`),
   create `<main>/.factory/<NNN>-<slug>/TASK.md` from the
   [task template](../templates/TASK_TEMPLATE.md) with status `backlog` and stage
   `intent`, plus any other path the caller names (the backlog claim), and commit only
   those paths (`git -C <main> commit -m "factory(<task>): create" -- <paths>`), which
   leaves other changes in the main checkout alone. Release the lock.
4. Create the task's worktree from `master`, which now holds the task, and continue
   there.

Two sessions never get the same number: the second waits on the lock, then reads the
first one's committed directory. Subtasks need no lock; their parent's managing agent
is the only writer of its `subtasks/` folder.

## Metadata and status

`TASK.md` frontmatter carries a nonempty `title`, quoted ISO `created` and
`updated` dates, `stage` and `status`:

| `status` | Board column | Meaning |
| --- | --- | --- |
| `backlog` | Backlog | Captured; nobody is working on it (any stage before `done`) |
| `inprogress` | In progress | An agent is working on it, in any stage |
| `blocked` | Blocked | A recorded decision or dependency prevents progress |
| `done` | Done | Review passed: requirements evidenced, reviewers satisfied, debrief and report written, specs updated |

`stage` is the pipeline position (`intent`, `design`, `plan`, `build`, `review`,
`done`); `status` is whether anyone is working on it. A missing or unknown status
reads as `backlog`. Change status by editing the key (or the board) and `updated`;
the directory is never renamed or moved, so worktrees and links survive. Record
blockers and the report link in the body. A status change is bookkeeping: it does not
approve work, run plans, prove completion or start sessions. Because state lives in
the file, browse it with the board or
`grep -r '^status:' .factory --include=TASK.md`.

## Subtasks

A subtask is a directory in its task's `subtasks/` folder with the same files,
`<task>/subtasks/<NNN>-<subtask-name>/`, numbered within its parent. A subtask intent needs no approval from the user
but refines, never contradicts, its parent's; record "Approval: not required, subtask
of `<parent>`". Subtasks nest without limit. The board shows a done/total count over
all descendants and never changes subtask status by itself. Dependencies between
siblings live in `TASK.md` under `## Depends on`; see [subtask graphs](subtasks.md).

## Older layouts

Tasks named `<name>-<status>/`, `<status>/<name>/` or kept in `docs/tasks/` are not
read by the board or hook. Migrate each: drop the status suffix from the directory
name (`git mv .factory/export-csv-done .factory/export-csv`), add the status as
`<meta name="status">` (legacy TASK.html) or a `status:` frontmatter key (TASK.md), and
move nested subtasks into `subtasks/`. Moved files keep their format; new documents,
debriefs and reports are always Markdown.

## Per-repository board

A read-only view of one repository's `.factory/`: kanban columns by `status`, the
`.factory/backlog.md` queue, and a drawer with each task's Markdown documents. It
changes nothing and starts no agents; the commands stay in the chat. Every project
carries its own copy, made of two skill assets:

- `skills/factory/assets/dashboard/board.ts`: the tiny server (Node.js 24+, built-ins
  only). It binds to `127.0.0.1` on a free port and prints the URL, serves only `.md`
  files under `.factory/` (no symlinks, `evidence/` or `worktree/`), checks the `Host`
  header and refuses everything but GET.
- `skills/factory/assets/dashboard/dashboard.html`: the page it serves, read from the
  directory beside `board.ts`. It polls every 2 seconds.

**Install and refresh.** When Factory starts in a project, or the user asks for the board:

1. Copy both files to `tools/factory-board/` in the project (create the directory).
   Do this when either is missing or `cmp` shows it differs from the skill's asset, so
   projects pick up board updates the next time Factory runs there. Copy as-is; never
   edit the project's copy.
2. If the project has a `package.json` without a `factory:board` script, add
   `"factory:board": "node tools/factory-board/board.ts ."` (keep the file's other keys
   and formatting). A project without `package.json` is launched with
   `node tools/factory-board/board.ts`. Node below 22.18 cannot run `.ts` files
   directly; when the project pins such a Node and has `tsx`, use `tsx` in place of `node`.
3. If the project runs its own linter or formatter over `tools/`, add
   `tools/factory-board/**` to their ignore lists: the copy keeps this repository's style
   and must stay byte-identical to the asset.
4. Commit the copy with the rest of the work. Leave the board running only when the user
   asks.

Launch it from the project root with `npm run factory:board` or
`node tools/factory-board/board.ts [repo] [--port N]`. Without a server, `dashboard.html`
also opens straight from disk in a Chromium browser: pick the repository or its
`.factory` folder once and the browser remembers it.

The page is React, shadcn-style components and Tailwind in the Claude look (light, dark
or system theme), bundled with its fonts into that one file, so it needs no network.
Task documents open in an animated drawer; inside a subtask, breadcrumbs lead back to
every parent task. Sources live in `skills/factory/assets/dashboard/src/`; after
changing them run `npm run build:dashboard` and commit the regenerated `dashboard.html`
(a test fails if it drifts).

This repository is the source of both assets and runs them in place with
`npm run factory:board`. The per-repository board is separate from the shared board below.

## One shared board

A single board serves every project; projects do not carry a copy. Run it with
`npx amirreza-factory [project-dir...]` (from this repository, `npm link` inside
`skills/factory/assets/task-board/` after `npm install` there, then run
`amirreza-factory`). Node.js 24+ is required. Listed directories are registered;
with none given and an empty registry the current directory is adopted if it has
`.factory/` . Registered projects persist in `~/.factory/projects.json`
(`FACTORY_HOME` overrides the directory) and can also be added or removed in the
UI header (a native folder dialog opens on the host; light/dark follows the system with a header toggle). The board binds to `127.0.0.1` on any free port (PORT overrides) and
reports the URL. Leave a preview running only when the user asks to use it. Never
add its `server.ts`, `index.html` or fonts to a project; projects use the per-repository
board above. In this repository it runs with `npm run factory:shared-board`.

The header shows the selected project name and a project switcher; the name is read from package.json
`displayName`, then `name`, then the project directory. React renders it as text.
Claude-reference cream/charcoal/clay tokens, locally served Anthropic Serif/Sans,
and restrained transitions carry the visual language. Motion respects reduced
motion. [Font sources](../assets/task-board/FONTS.md) are recorded with the assets.
