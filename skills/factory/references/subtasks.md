# Subtask graphs and parallel execution

Read when a task is split into subtasks that depend on each other or will be
built concurrently. The layout, stages and approval rules in [tasks](tasks.md)
still apply; this guide adds how to cut subtasks, record their dependencies and
run the ready ones in parallel.

## Cut vertical slices

Prefer **tracer-bullet** subtasks: each is a narrow but complete path through every
layer it touches (schema, logic, interface, tests), verifiable on its own and
small enough for one fresh context window. Avoid horizontal subtasks ("all the
types", "all the UI") that cannot be verified until another one lands.

- Do any prefactoring first, as its own subtask: make the change easy, then make
  the easy change.
- Phrase each subtask intent in domain vocabulary and observable behavior, with
  acceptance checks. Avoid file paths and code snippets in intents; they go stale and belong in the plan.
  Keep a snippet only when it encodes a decision prose cannot (state machine,
  schema, type shape).

**Wide refactor exception.** A mechanical change whose blast radius spans the
codebase (rename a column, retype a shared symbol) cannot land green as a vertical
slice. Sequence it as expand–contract: an *expand* subtask adds the new form
beside the old; *migrate* subtasks move callers over in batches sized by blast
radius, each depending on the expand; a final *contract* subtask removes the old
form and depends on every migrate batch. If batches cannot stay green alone,
let them share one integration branch and depend a final integrate-and-verify
subtask on all of them.

## Record dependencies

Dependencies are edges between sibling subtasks of the same parent. List them in
the subtask's `INTENT.md` under Boundaries as `- **Depends on:** <sibling>, ...` (sibling subtask directory names; omit when none).
Edges describe what must be `done` first, never a preferred order. Keep them
minimal and acyclic; split or merge subtasks to break a cycle. Dependency edges
do not change how a stage is read.

The **frontier** is every subtask not yet `done` whose dependencies are all
`done`. Work the frontier; a linear chain is simply a frontier of one.

## Run the frontier in parallel

The managing agent owns the graph and runs this loop:

1. Read the parent intent and design, and every subtask's `INTENT.md` and `PLAN.md`
   to build the graph. Do the shared exploration once (a fresh subagent that
   saves notes outside the repo, in `.work/`, for later subagents) so implementers
   do not each rediscover the same code.
2. Create one integration branch for the parent task, named per the repository
   branch rules, with its worktree at `<main>/.worktrees/<branch>/`.
3. For each frontier subtask, start a fresh-context **implementer subagent** in
   the background, in its own worktree at `<main>/.worktrees/<branch>/` on its own branch.
   Run independent subtasks concurrently; never give two concurrent writers
   overlapping files. If two frontier subtasks touch the same files, serialize
   them by adding a dependency edge.
4. Brief each implementer with **context pointers** (parent intent and design, its subtask
   directory, exploration notes, relevant prior commits) rather than copied
   text. It confirms its worktree is based on the integration branch, builds its
   subtask, runs only its plan's `fast` tests, merges the integration tip into its branch,
   commits, and reports. It must not run heavy validation gates and must not
   edit the parent intent or sibling subtasks, and it writes its own `DEBRIEF.md` only
   when it found something worth recording.
5. When an implementer reports, merge its branch into the integration branch
   (a separate merger subagent or the manager), resolve conflicts, and record
   `**Merged:** <sha>` with the results in its plan's Revisions; that line makes the
   subtask `done`.
6. Recompute the frontier; start newly unblocked subtasks immediately.
7. When every subtask is `done`, the managing agent alone runs [Verify](build.md#verify-last) (heavy gates last) on the integration
   branch and fixes failures, using one fresh implementer subagent for a batch of fixes
   when useful, then runs the [Review stage](review.md).
8. Write `REVIEW.md`, update specs, record the parent's passing review verdict, and
   remove every implementer worktree.

Keep communication with subagents sparse: pointers in, a short report out. A
subtask blocked on a decision records the blocker with the reason in its `PLAN.md`;
the rest of the frontier continues.

Adapted from the implement-spec and to-tickets skills in mattpocock/skills; this
repository has no dependency on them.
