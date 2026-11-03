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

1. Take the lock of [Creating a task](tasks.md#creating-a-task-one-lock-one-commit),
   check that `<main>` is on `master`, and read `<main>/.factory/backlog.md`. If it is
   missing or has no `- [ ]` line, release the lock, say so and stop; create no file
   and no task.
2. Take the first `- [ ]` line and pick the task name from the item. In the shared
   claim commit, replace exactly that line with `- [x] <item> → <NNN>-<slug>` and
   include `.factory/backlog.md` among the committed paths, so the claim and the new
   task land together.
3. Continue from the worktree of that task: run `/factory intent` on it with the item
   and its indented context as the request. The pipeline is unchanged: the user's
   approval of `INTENT.md` is the gate, and `/factory next` never runs design, plan or
   build by itself. Writing a line in the backlog does not approve anything.

Run `/factory next` once per call; starting several tasks takes several calls, so the
user chooses how much runs at once.

## Rules

- A backlog line is not a task: it has no status and the board does not list it.
- Never delete a taken line; the arrow is the link from the request to its task.
- Findings appended by agents are one line with the reason and a pointer to the
  originating task (`from 003-rate-limit review`).
