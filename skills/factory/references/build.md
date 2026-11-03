# Build: implement the plan, then prove it

Goal: the full planned scope implemented, every `fast` test passing, every
requirement evidenced, the plan's `heavy` gates run once at the very end, and a
`DEBRIEF.md` and `REPORT.md` for the people who read next. Build has no specification
of its own; `PLAN.md` is the specification. Build and verification are one stage so
development never waits on slow checks: **cheap checks run continuously, heavy gates
run last.**

## Start

Set the task status to `inprogress` and the stage to `build`. Work in a worktree
under the task directory, `.factory/<task>/worktree/<branch>/` (gitignored). Status
changes never move the directory, so the worktree stays valid. Read `INTENT.md`, `DESIGN.md`, `PLAN.md` and the project's agent
memory (`AGENTS.md`/`CLAUDE.md`).

## The feedback loop

Give yourself a check for every change, and use it continuously:

1. **Bugs first get a failing test.** Write the plan's reproducing test, run it, and
   confirm it fails for the expected reason. Commit it. Then fix the code **without
   editing that test**.
2. Write each planned `fast` test with the code it covers, or before it.
3. After each step, run the fast tests the step touches; before the build ends, run
   all of them. When a test fails, fix the code, not the test. Never skip, delete or
   loosen a test to pass, and never weaken an assertion the plan defined.
4. UI work closes the loop visually: implement, screenshot, compare with the
   `design/` mock, adjust. Two or three rounds is normal.
5. Keep checks fast and scoped while iterating. Heavy suites wait for [Verify](#verify-last).

Implement the whole plan before any extended qualification. A half-built scope proves
nothing. Heavy gates are never run mid-build.

## Stay on the plan

Follow the plan's order and contracts. When reality departs from it, update
`PLAN.md` **in the same commit** as the departing code (date, reason, affected IDs,
impact). Requirement or design conflicts stop for the user; record the blocker in
`TASK.md` and set the status to `blocked`.

Commit in coherent increments. Each message names the task and the plan steps
(`factory(<task>): build M2-M3`).

## Parallel build

With subtasks or independent plan steps, build in parallel only when the user authorized
subagents or sessions. Follow [subtask graphs](subtasks.md): one worktree per writer,
no two writers on the same files, pointers in and a short report out. Implementers
run only their fast tests and never heavy gates; only the managing agent runs Verify.

## Verify last

Only the managing agent runs this, once, on the whole task, after the scope is
implemented and the debrief is written. Run in this order, stop at a failing gate, fix,
and repeat the affected gates:

1. **Regression (cheap).** The project's existing checks (`npm test`, lint, types, or
   the project's equivalent) and every `fast` test in the plan. Separate pre-existing
   failures (reproduce them on the base revision) from failures this change introduced.
2. **Acceptance.** Map every intent requirement and design decision to observed
   evidence: test output, screenshots matching the `design/` mock, command output,
   or a manual procedure with its observed result. A green suite alone proves neither
   coverage nor quality.
3. **Heavy gates, last.** The plan's `heavy` tests and the quality checks that fit the
   change: e2e and browser suites, visual comparison, accessibility, performance and
   load, security scans, cross-platform runs. They are slow, so they run only after
   everything cheaper is green. Use
   [resource-bounded runs](../../resource-bounded-runs/SKILL.md) for large ones.

Fix failures in the code. For a batch of fixes, one fresh implementer subagent may
do the work; re-run the affected gates afterwards. When a fix changes the approach,
revise `PLAN.md` in the same commit and add the incident to `DEBRIEF.md`.

### Evidence rules

Record command, revision, environment and the literal result for each gate. Never
claim an unrun check passed; mark it Not run or Blocked with the reason. Keep raw
output (json, logs, traces, png) in the task's gitignored `evidence/` folder; track
only the Markdown report.

### Report

Write `REPORT.md` in the task directory, next to the debrief, from the
[test report template](../templates/TEST_REPORT_TEMPLATE.md). First screen: the
verdict, the requirement matrix (`R`/`D` → test → result), and anything the user must
decide. Below that: gate results, limitations and out-of-scope findings. Link the
report from `TASK.md`. The Review stage appends its findings to it.

Then commit, set the stage to `review`, and continue with `/factory review` when
`/factory` is running the pipeline. Build does not set the task to `done`; Review does.

## Debrief

When the scope is implemented and the fast tests pass, write `DEBRIEF.md` from the
[debrief template](../templates/DEBRIEF_TEMPLATE.md) in the task directory. Copy
the template whole and fill its sections. It is for future agents and engineers; include what they could not learn from the diff:

- What was built against the plan: steps done, revisions and why.
- Abnormalities: surprising behavior, flaky or slow tests, environment quirks, tool
  failures and their workarounds.
- Traps and lessons: what cost time, what a newcomer would get wrong, what to check first.
- **Memory candidates:** a mistake made twice, or a convention the agent kept missing.
  Propose the exact line for `AGENTS.md`/`CLAUDE.md` or the relevant skill; apply it
  only within this task's scope or when the user asks.
- Out-of-scope findings with evidence and location (see the loop in the Factory skill).
- Fast test results: command, revision, outcome.
