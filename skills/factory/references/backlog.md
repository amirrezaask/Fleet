# Backlog: requests waiting for a task

`.factory/backlog.md` is a plain queue the user fills by hand, and agents append
out-of-scope findings to. A line costs nothing: no task directory, no intent, no number.
Work starts only when `/factory next` runs, for example when resources allow.

## Format

```markdown
# Backlog

- [ ] Rate limit the signup form
- [ ] Export invoices as CSV (finance asked; monthly, UTC)
  Extra context for this item goes on indented lines below it.
- [x] Add dark mode → 004-dark-mode
```

- `- [ ]` is open. The queue is top to bottom: the first open line is next.
- `- [x] <item> → <task-dir>` is taken; the arrow names the task made from it.
- Indented lines under an item are context for its intent; copy them in verbatim.
- Keep the file free of anything else. The user reorders or deletes lines freely.

## `/factory next`

Sessions run in separate worktrees and cannot see each other's edits, so the claim is
made once, on `master` in the main checkout, under a lock all sessions share. The main
checkout is the directory that holds the git common dir
(`dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`); call it `<main>`.

1. **Lock.** `mkdir <main>/.git/factory-claim.lock` (no `-p`; the directory is
   untracked). If it exists, wait a few seconds and retry; if it is older than ten
   minutes, a session crashed: remove it and retry. Always `rmdir` it when step 3 ends,
   including on failure.
2. **Check.** `<main>` must be on `master`; if not, release the lock and tell the user.
   Read `<main>/.factory/backlog.md`. If it is missing or has no `- [ ]` line, release
   the lock, say so and stop; create no file and no task.
3. **Claim and number, in one commit on `master`.** Take the first `- [ ]` line.
   Pick the task directory `<NNN>-<slug>` (next free number in `<main>/.factory/`,
   slug from the item). Replace exactly that line with `- [x] <item> → <NNN>-<slug>`,
   create `<main>/.factory/<NNN>-<slug>/TASK.md` from the
   [task template](../templates/TASK_TEMPLATE.md) with status `backlog` and stage
   `intent`, and commit only those two paths
   (`git -C <main> commit -m "factory(<task>): claim from backlog" -- .factory/backlog.md .factory/<NNN>-<slug>`),
   which leaves any other change in the main checkout alone. Release the lock.
4. **Intent.** Create the task's worktree from `master` (it now holds the claim), then
   run `/factory intent` on the task with the item and its indented context as the
   request. The pipeline is unchanged: the user's approval of `INTENT.md` is the gate,
   and `/factory next` never runs design, plan or build by itself. Writing a line in
   the backlog does not approve anything.

Two sessions can never take the same line or the same number: the second one waits on
the lock, then reads the first one's committed claim. Run `/factory next` once per
call; starting several tasks takes several calls, so the user chooses how much runs at
once.

## Rules

- A backlog line is not a task: it has no status and the board does not list it.
- Never delete a taken line; the arrow is the link from the request to its task.
- Findings appended by agents are one line with the reason and a pointer to the
  originating task (`from 003-rate-limit review`).
