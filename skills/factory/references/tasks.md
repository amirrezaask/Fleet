# Task documents

## Layout

[`<factory>/tasks/`](#the-task-store), outside the repository, lists every task. Each task is one directory named
`<NNN>-<task-name>`, and the name never changes:

```text
~/.agents/projects/<project>/
  TASKS.md                                                    # generated index, one line per task
  backlog.md                                                  # requests without a task yet
  tasks/
    001-account-recovery/
      INTENT.md  DESIGN.md  PLAN.md  DEBRIEF.md  REVIEW.md
      design/                                                 # design artifacts
        flow.md  mock.html  states.png
      evidence/                                               # raw test output, gitignored
      subtasks/
        001-email-token/                                      # subtask, same layout
        002-rate-limit/
    002-export-csv/
```

`<NNN>` is a three-digit, zero-padded sequence number (`001`, `002`, ...) so the
directories always list in creation order: a new task takes one more than the highest
number among its siblings in `<factory>/tasks/` (or in the parent's `subtasks/`), starting at
`001`; numbers are never reused or renumbered. The rest of the name is lowercase ASCII
letters and numbers separated by single hyphens, unique among its siblings. Commands
may name a task by its full directory name, its number or its slug. Reuse existing tasks; never overwrite another task to resolve a
collision. Only directories inside `subtasks/` are subtasks, so `design/`
and `evidence/` are never mistaken for them. Link between a task's own
files with relative paths (`design/mock.html`, `REVIEW.md`, `../DESIGN.md`).

A task starts from a request. Requests without a task yet wait in
[`<factory>/backlog.md`](backlog.md), which is a file, not a task.

## The task store

Task documents do not live in the repository. Each project has one **task store** in
the agent memory vault, shared by all its worktrees and all agents, so a new document is
visible everywhere the moment it is written. It is `~/.agents/projects/<project>/`, where
`<project>` is the main checkout's path relative to home, e.g. `dev/GameBox`. From any
worktree:

```sh
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
factory=$HOME/.agents/projects/${main#"$HOME"/}
```

`<factory>` below means this directory; always write task documents there by absolute
path and never into a worktree. On first use, `mkdir -p <factory>/tasks`.

The vault (`~/.agents`) is one Git repository, which keeps the history of the documents
and ignores every `evidence/` folder. Commit only your task, so concurrent agents do not
sweep up each other's edits, and retry if `index.lock` is held:
`git -C ~/.agents add -- <task> && git -C ~/.agents commit -q -m "<message>" -- <task>`.
Code is still committed in the worktree, in the project's own repository. After moving
a checkout, `mv` its store to the new key.

`<factory>/TASKS.md` is generated, never edited: after a commit that creates a task,
adds a stage document or closes a task, run `tasks-index` and commit `TASKS.md` with it.

## Creating a task: one lock, one commit

Every session sees the same store, so a new task is visible to all of them as soon as
it is written; only the number needs protecting. Every new top-level task (from
`/factory intent` or `/factory next`) takes its number under a lock all sessions share.
The main checkout is the directory that holds the git common dir
(`dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`); call it `<main>`.

1. **Lock.** Set up [the store](#the-task-store) if needed, then
   `mkdir ~/.agents/.git/factory-claim.lock` (no `-p`). If it exists, wait a few seconds
   and retry; if it is older than ten minutes, a session crashed: remove it and retry.
   Always `rmdir` it when step 2 ends, including on failure.
2. **Number and commit.** Pick `<NNN>-<slug>` (next free number in `<factory>/tasks/`)
   and create the directory `<factory>/tasks/<NNN>-<slug>/`. When the caller names another
   path (the backlog claim), commit only that path in the vault. Release the lock.
3. Create the task's worktree at `<main>/.worktrees/<branch>/` from the default branch
   and continue there.

Two sessions never get the same number: the second waits on the lock, then reads the
first one's directory. Subtasks need no lock; their parent's managing agent
is the only writer of its `subtasks/` folder.

## Reading a task's state

A task has no metadata file. Everything is derived or lives in the stage documents: the
title is the heading of `INTENT.md`, subtasks are the `subtasks/` directories, the
outcome is `REVIEW.md`, and the parent is the enclosing directory. The **stage** is the
latest stage document the task holds:

| Latest document | Stage | Meaning |
| --- | --- | --- |
| none | `new` | The directory is claimed; the intent is not written yet |
| `INTENT.md` | `intent` | Captured; approved once it carries its approval entry |
| `DESIGN.md` | `design` | Designed; accepted once it carries its acceptance entry |
| `PLAN.md` | `plan` | Planned; Build is next or under way |
| `DEBRIEF.md` or `REVIEW.md` | `build` | Built; `REVIEW.md` adds the verification, and Review is next or under way |
| `REVIEW.md` with `**Review verdict:** PASS` | `done` | Review passed: requirements evidenced, reviewers satisfied, `DEBRIEF.md` and `REVIEW.md` written, specs updated |

A blocker (a recorded decision or dependency that prevents progress) is written, dated
and with its reason, into the document of the stage it stops: the Revisions of `PLAN.md`
during Build, and `**Review verdict:** Blocked: <reason>` in `REVIEW.md` during Review.
Remove or answer it there when it is resolved. Recording a stage document or a blocker
is bookkeeping: it does not approve work, run plans or start sessions; only the review
verdict claims completion. Because state lives in the documents, browse it in
`<factory>/TASKS.md`, or list the finished tasks with
`grep -rl '^\*\*Review verdict:\*\* PASS' <factory>/tasks --include=REVIEW.md`.

## Subtasks

A subtask is a directory in its task's `subtasks/` folder with the same files,
`<task>/subtasks/<NNN>-<subtask-name>/`, numbered within its parent. A subtask intent needs no approval from the user
but refines, never contradicts, its parent's; record "Approval: not required, subtask
of `<parent>`". Subtasks nest without limit. A subtask built inside its parent's
integration branch has no review of its own: it is `done` when its `PLAN.md` records
`**Merged:** <sha>`. Dependencies between siblings live in the subtask's `INTENT.md`;
see [subtask graphs](subtasks.md).

## Older layouts

`TASK.md` files written before 2026-11-21 stay in place; Factory no longer reads or
updates them, and a task that has one is read like any other, from its stage documents.

Tasks named `<name>-<status>/`, `<status>/<name>/` or kept in `docs/tasks/` or
`~/.agents/factory/<project>/` are not read. Migrate each: drop the status suffix from the
directory name (`mv <old>/export-csv-done <factory>/tasks/export-csv`) and move nested
subtasks into `subtasks/`. Moved files keep their format; new documents, debriefs and
reviews are always Markdown.

A project whose tasks are still in `.factory/` in the repository is invisible until
moved to the store. With no agent working in it, set up the store, then:

```sh
rsync -a --exclude worktree/ "<main>/.factory/" "<factory>/tasks/"
git -C ~/.agents add -- <factory> && git -C ~/.agents commit -q -m "import tasks from <project>" -- <factory>
```

and on a branch in the project `git rm -r .factory` and drop the `.factory/**` lines from
`.gitignore`. Earlier document history stays in the project's own Git log.

Before copying, take task documents that exist only on live branches into the store, and
`git worktree move` any worktree inside `.factory/` to `.worktrees/`. A branch that still
carries `.factory/` then conflicts when merged; resolve that with `git rm -rq .factory`.
