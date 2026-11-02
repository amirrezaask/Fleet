# Test: prove the whole task and close it

Goal: verified evidence that nothing regressed and that every requirement is met,
recorded in a report the user can judge from its first screen. Build has already run
the plan's `fast` tests. This stage re-runs them as regression and then runs the
expensive gates, once, on the whole task. Only the managing agent runs this stage.

## Order

Run in this order, stop at a failing gate, fix, and repeat the affected gates:

1. **Regression (cheap).** The project's existing checks (`npm test`, lint, types, or
   the project's equivalent) and every `fast` test in the plan. Separate pre-existing
   failures (reproduce them on the base revision) from failures this change introduced.
2. **Acceptance.** Map every intent requirement and design decision to observed
   evidence: test output, screenshots matching the `design/` mock, command output,
   or a manual procedure with its observed result. A green suite alone proves neither
   coverage nor quality.
3. **Fresh-context verification and review.** Start a fresh subagent with pointers to
   `INTENT.html`, `DESIGN.html`, `PLAN.html` and the diff, not your conclusions. It runs
   the changed behavior and its nearest neighboring flows, then reviews in three
   passes: **bugs** (logic, edge cases, regressions), **security** (input handling,
   auth, secrets, PII in logs), and **compliance** (the diff matches the intent,
   design and plan, and the plan matches the diff). Findings are `Important` (breaks
   behavior, leaks data, violates a requirement or policy) or `Nit`; report at most five
   nits. The reviewer reports only and fixes nothing. Verify each finding yourself before
   acting on it.
4. **Heavy gates.** The plan's `heavy` tests and the quality checks that fit the
   change: e2e and browser suites, visual comparison, accessibility, performance and
   load, security scans, cross-platform runs. Use
   [resource-bounded runs](../../resource-bounded-runs/SKILL.md) for large ones.

Fix failures in the code. For a batch of fixes, one fresh implementer subagent may
do the work; re-run the affected gates afterwards. When a fix changes the approach,
revise `PLAN.html` in the same commit and add the incident to `DEBRIEF.html`.

## Evidence rules

Record command, revision, environment and the literal result for each gate. Never
claim an unrun check passed; mark it Not run or Blocked with the reason. Keep raw
output (json, logs, traces, png) in the task's gitignored `evidence/` folder; track
only the HTML.

## Report

Write `REPORT.html` in the task directory, next to the debrief, from the
[test report template](../templates/TEST_REPORT_TEMPLATE.html). First screen: the
verdict, the requirement matrix (`R`/`D` → test → result), and anything the user must
decide. Below that: gate results, review findings and their resolution, limitations
and out-of-scope findings. Link the report from `TASK.html`.

## Close

1. Update the affected specs from the verified behavior
   ([specification integration](specifications.md)).
2. Out-of-scope findings worth doing become draft-intent tasks named `<name>-backlog`.
3. A memory candidate from the debrief that recurred here is proposed to the user as a
   concrete `AGENTS.md`/`CLAUDE.md` or skill edit.
4. Rename the task to `-done`, set the stage to `done`, and update `updated`. Commit.

`-done` requires: all requirements evidenced, every gate passed or explicitly accepted
by the user as a known limitation, the debrief and report present, and specs matching
the verified behavior. A task named `-done` without that evidence is reported and
reconciled before anyone claims success. Then follow the project's worktree cleanup rules.
