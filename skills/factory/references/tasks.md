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

## Per-repository dashboard

A read-only view of one repository's `.factory/`: kanban columns by `status`, the
`.factory/backlog.md` queue, and a drawer with each task's Markdown documents. It
changes nothing and starts no agents; the commands stay in the chat. Two ways to run the
same `skills/factory/assets/dashboard/dashboard.html`:

- **Server:** `factory-dashboard [repo] [--port N]` (linked onto PATH by the installer;
  in this repository `npm run factory:dashboard`). Node.js 24+, built-ins only, binds to
  `127.0.0.1` on a free port and prints the URL. It serves only `.md` files under
  `.factory/` (no symlinks, `evidence/` or `worktree/`), checks the `Host` header, and
  refuses everything but GET. The page polls every 2 seconds. Leave it running only
  when the user asks.
- **Standalone:** open `dashboard.html` straight from disk (or copy it to a repository)
  in a Chromium browser and pick the repository or its `.factory` folder once; the
  browser remembers the folder and asks only for read permission again. No process runs.

The page is React, shadcn-style components and Tailwind in the Claude look (light, dark
or system theme), bundled with its fonts into that one file, so it needs no network.
Task documents open in an animated drawer; inside a subtask, breadcrumbs lead back to
every parent task. Sources live in `skills/factory/assets/dashboard/src/`; after
changing them run `npm run build:dashboard` and commit the regenerated `dashboard.html`
(a test fails if it drifts).

Never copy the server or add a `factory:dashboard` script to a project: the skill keeps
the single copy. This is separate from the shared board below.

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
add `server.ts`, `index.html`, fonts or a `factory:board` script to a project.

The header shows the selected project name and a project switcher; the name is read from package.json
`displayName`, then `name`, then the project directory. React renders it as text.
Claude-reference cream/charcoal/clay tokens, locally served Anthropic Serif/Sans,
and restrained transitions carry the visual language. Motion respects reduced
motion. [Font sources](../assets/task-board/FONTS.md) are recorded with the assets.
