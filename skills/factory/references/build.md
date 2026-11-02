# Build: implement the plan and keep its fast tests green

Goal: the full planned scope implemented, every `fast` test in the plan passing,
and a `DEBRIEF.html` that tells the next agent or engineer what they need to know.
Build has no specification of its own; `PLAN.html` is the specification.

## Start

Rename the task to `-inprogress` and set the stage to `build`. Work in the project's
worktree flow. Read `INTENT.html`, `DESIGN.html`, `PLAN.html` and the project's agent
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
5. Keep checks fast and scoped while iterating. Heavy suites wait for Test.

Implement the whole plan before any extended qualification. A half-built scope proves
nothing.

## Stay on the plan

Follow the plan's order and contracts. When reality departs from it, update
`PLAN.html` **in the same commit** as the departing code (date, reason, affected IDs,
impact). Requirement or design conflicts stop for the user; record the blocker in
`TASK.html` and rename the task to `-blocked`.

Commit in coherent increments. Each message names the task and the plan steps
(`factory(<task>): build M2-M3`).

## Parallel build

With subtasks or independent plan steps, build in parallel only when the user authorized
subagents or sessions. Follow [subtask graphs](subtasks.md): one worktree per writer,
no two writers on the same files, pointers in and a short report out. Implementers
run only their fast tests and never heavy gates.

## Debrief

Before leaving Build, write `DEBRIEF.html` from the
[debrief template](../templates/DEBRIEF_TEMPLATE.html) in the task directory. It is
for future agents and engineers; include what they could not learn from the diff:

- What was built against the plan: steps done, revisions and why.
- Abnormalities: surprising behavior, flaky or slow tests, environment quirks, tool
  failures and their workarounds.
- Traps and lessons: what cost time, what a newcomer would get wrong, what to check first.
- **Memory candidates:** a mistake made twice, or a convention the agent kept missing.
  Propose the exact line for `AGENTS.md`/`CLAUDE.md` or the relevant skill; apply it
  only within this task's scope or when the user asks.
- Out-of-scope findings with evidence and location (see the loop in the Factory skill).
- Fast test results: command, revision, outcome.

Then commit, set the stage to `test`, and continue with `/factory-test` when `/factory`
is running the pipeline.
