# Task documents and local board

## Layout

[`<factory>/`](#the-task-store), outside the repository, lists every task. Each task is one directory named
`<NNN>-<task-name>`, and the name never changes:

```text
~/.agents/factory/<project>/
  001-account-recovery/
    TASK.md  INTENT.md  DESIGN.md  PLAN.md  DEBRIEF.md  REVIEW.md
    design/                                                   # design artifacts
      flow.md  mock.html  states.png
    evidence/                                                 # raw test output, gitignored
    subtasks/
      001-email-token/                                        # subtask, same layout
      002-rate-limit/
  002-export-csv/
```

`<NNN>` is a three-digit, zero-padded sequence number (`001`, `002`, ...) so the
directories always list in creation order: a new task takes one more than the highest
number among its siblings in `<factory>/` (or in the parent's `subtasks/`), starting at
`001`; numbers are never reused or renumbered. The rest of the name is lowercase ASCII
letters and numbers separated by single hyphens, unique among its siblings. Commands
may name a task by its full directory name, its number or its slug. Reuse existing tasks; never overwrite another task to resolve a
collision. Only directories inside `subtasks/` are subtasks, so `design/`
and `evidence/` are never mistaken for them. Link between a task's own
files with relative paths (`design/mock.html`, `REVIEW.md`, `../DESIGN.md`).

A task starts from a request. Requests without a task yet wait in
[`<factory>/backlog.md`](backlog.md), which is a file, not a directory, and the board
ignores it.

## The task store

Task documents do not live in the repository. Each project has one **task store**,
shared by all its worktrees, all agents and the board, so a status change is visible
everywhere the moment it is written. It is `~/.agents/factory/<project>/`, where
`<project>` is the main checkout's path relative to home, e.g. `dev/GameBox`
(`$FACTORY_HOME` overrides the root). From any worktree:

```sh
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
factory=${FACTORY_HOME:-$HOME/.agents/factory}/${main#"$HOME"/}
```

`<factory>` below means this directory; always write task documents there by absolute
path and never into a worktree. On first use, `mkdir -p <factory>`, and if it has no
`.git`, run `git -C <factory> init -q` and write `evidence/` to `<factory>/.gitignore`.

The store is its own Git repository, which keeps the history of the documents. Commit
only your task, so concurrent agents do not sweep up each other's edits, and retry if
`index.lock` is held:
`git -C <factory> add -- <task> && git -C <factory> commit -q -m "<message>" -- <task>`.
Code is still committed in the worktree, in the project's own repository. After moving
a checkout, `mv` its store to the new key.

## Creating a task: one lock, one commit

Every session sees the same store, so a new task is visible to all of them as soon as
it is written; only the number needs protecting. Every new top-level task (from
`/factory intent` or `/factory next`) takes its number under a lock all sessions share.
The main checkout is the directory that holds the git common dir
(`dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`); call it `<main>`.

1. **Lock.** Set up [the store](#the-task-store) if needed, then
   `mkdir <factory>/.git/factory-claim.lock` (no `-p`). If it exists, wait a few seconds
   and retry; if it is older than ten minutes, a session crashed: remove it and retry.
   Always `rmdir` it when step 2 ends, including on failure.
2. **Number and commit.** Pick `<NNN>-<slug>` (next free number in `<factory>/`), create
   `<factory>/<NNN>-<slug>/TASK.md` from the
   [task template](../templates/TASK_TEMPLATE.md) with status `backlog` and stage
   `intent`, plus any other path the caller names (the backlog claim), and commit only
   those paths in the store. Release the lock.
3. Create the task's worktree at `<main>/.worktrees/<branch>/` from the default branch
   and continue there.

Two sessions never get the same number: the second waits on the lock, then reads the
first one's directory. Subtasks need no lock; their parent's managing agent
is the only writer of its `subtasks/` folder.

## Metadata and status

`TASK.md` is frontmatter only: a nonempty `title`, quoted ISO `created` and
`updated` dates, `stage` and `status`, plus optional `blocker` (reason, while blocked)
and `depends_on` (sibling subtasks, subtasks only). Everything else is derived or lives
in the stage documents: subtasks are the `subtasks/` directories, the outcome is
`REVIEW.md`, and the parent is the enclosing directory.

| `status` | Board column | Meaning |
| --- | --- | --- |
| `backlog` | Backlog | Captured; nobody is working on it (any stage before `done`) |
| `inprogress` | In progress | An agent is working on it, in any stage |
| `blocked` | Blocked | A recorded decision or dependency prevents progress |
| `done` | Done | Review passed: requirements evidenced, reviewers satisfied, `DEBRIEF.md` and `REVIEW.md` written, specs updated |

`stage` is the pipeline position (`intent`, `design`, `plan`, `build`, `review`,
`done`); `status` is whether anyone is working on it. A missing or unknown status
reads as `backlog`. Change status by editing the key (or the board) and `updated`;
the directory is never renamed or moved, so worktrees and links survive. Record
the blocker in `blocker:`. A status change is bookkeeping: it does not
approve work, run plans, prove completion or start sessions. Because state lives in
the file, browse it with the board or
`grep -r '^status:' <factory> --include=TASK.md`.

## Subtasks

A subtask is a directory in its task's `subtasks/` folder with the same files,
`<task>/subtasks/<NNN>-<subtask-name>/`, numbered within its parent. A subtask intent needs no approval from the user
but refines, never contradicts, its parent's; record "Approval: not required, subtask
of `<parent>`". Subtasks nest without limit. The board shows a done/total count over
all descendants and never changes subtask status by itself. Dependencies between
siblings live in `TASK.md` as `depends_on`; see [subtask graphs](subtasks.md).

## Older layouts

Tasks named `<name>-<status>/`, `<status>/<name>/` or kept in `docs/tasks/` are not
read by the board or hook. Migrate each: drop the status suffix from the directory
name (`mv <factory>/export-csv-done <factory>/export-csv`), add the status as
`<meta name="status">` (legacy TASK.html) or a `status:` frontmatter key (TASK.md), and
move nested subtasks into `subtasks/`. Moved files keep their format; new documents,
debriefs and reports are always Markdown.

A project whose tasks are still in `.factory/` in the repository is invisible to the
board and hook until moved to the store. With no agent working in it, set up the store,
then:

```sh
rsync -a --exclude worktree/ "<main>/.factory/" "<factory>/"
git -C <factory> add -A && git -C <factory> commit -q -m "import tasks from <project>"
```

and on a branch in the project `git rm -r .factory` and drop the `.factory/**` lines from
`.gitignore`. Earlier document history stays in the project's own Git log.

Before copying, take task documents that exist only on live branches into the store, and
`git worktree move` any worktree inside `.factory/` to `.worktrees/`. A branch that still
carries `.factory/` then conflicts when merged; resolve that with `git rm -rq .factory`.

## One shared board

A single board serves every project; projects do not carry a copy. Run it with
`npx amirreza-factory [project-dir...]` (from this repository, `npm link` inside
`skills/factory/assets/task-board/` after `npm install` there, then run
`amirreza-factory`). Node.js 24+ is required. Listed directories are registered;
with none given and an empty registry the current directory is adopted if it has
a task store. Registered projects persist in `~/.agents/factory/projects.json`
(`FACTORY_HOME` overrides the directory) and can also be added or removed in the
UI header (a native folder dialog opens on the host; light/dark follows the system with a header toggle). The board binds to `127.0.0.1` on any free port (PORT overrides) and
reports the URL. Leave a preview running only when the user asks to use it. Never
add its `server.ts`, `index.html` or fonts to a project. In this repository it runs with
`npm run factory:board`.

Views are Board (status columns plus a read-only Queue column of `backlog.md` lines, reorderable),
Pipeline, Focus, Hill, Timeline, Table and Portfolio (keys `1`-`7`, `/` filters). Change a task's
status by dragging its card between columns or from the right-click menu on any task title or
card outside Portfolio. A task opens with Intent, Design, Plan and Debrief tabs and one tab per
other Markdown file (`TASK.md`, `REVIEW.md`, `design/*.md`); `.md` links between them switch tabs.

The header shows the selected project and a project switcher; the name is read from
package.json `displayName`, then `name`, then the project directory.
