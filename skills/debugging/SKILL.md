---
name: debugging
description: Find and fix the root cause of a defect such as a failing test, crash, wrong output, flaky check or regression. Use when behavior differs from what is expected and the cause is not yet proven; a fix whose cause is already known does not need it.
---

# Debugging

A defect is fixed when evidence explains its cause, a test that failed because of that
cause now passes, and nothing unrelated changed. A symptom that stopped appearing is not
a fix.

## 1. Reproduce

Get the exact command or steps, revision, input and environment, with the expected and
the actual result. Reduce it to the smallest case that still fails. For a flaky failure,
measure the failure rate over repeated runs so that a later "fixed" means something.
When it cannot be reproduced, collect evidence (logs, traces, the reporter's inputs) and
say so; do not ship a guess as a fix.

## 2. Attribute

Run the reproduction on the base revision to separate a failure this work introduced
from one that was already there. With a known good revision, `git bisect` finds the
change faster than reading does. Before repairing anything, rule out another agent's or
session's uncommitted edits and a stale assertion.

## 3. Narrow

- Read the whole error and stack, then follow the wrong value backwards to the first
  place it is wrong. Where the error surfaced is often not where it started.
- Hold one hypothesis at a time. State it and the observation that would refute it, then
  make that observation with a log line, a debugger or a focused test.
- Compare with a case that works: same code with different input, or the same input on an
  older revision.
- Do not edit code to see whether it helps, and never stack several speculative changes.
- After three refuted hypotheses your model of the system is wrong: reread the code path
  and its specs under `docs/` before guessing again.

## 4. State the cause

Write it as a mechanism: "X happens because Y when Z", with the evidence. Then ask why
the existing tests did not catch it; that answer decides which test to add.

## 5. Failing test first

Write the test that reproduces the defect, run it, and confirm it fails for the stated
reason. Commit it. Then fix the code **without editing that test**.

## 6. Fix the cause

Make the smallest change at the place that owns the broken invariant. These hide a
defect instead of fixing it: retries, sleeps and longer timeouts; a broad `catch`; a
null guard over state that should never be null; special-casing the test's input; a
weakened assertion; a skipped or deleted check. When only a workaround is possible (a
third-party bug), label it as one and link the cause.

## 7. Verify and report

Run the reproducing test, the original steps through the original entry point, and the
tests around the changed code. Search for the same mistake elsewhere and fix it when it
is in scope, or report it. Remove the instrumentation you added.

Report the symptom, the cause, the fix, the evidence, and what was not verified. Never
claim a check passed that was not run. Record a trap worth keeping in the task's
`DEBRIEF.md` or the owning document under `docs/areas/`.

Slowness, memory growth and frame drops are measured problems: use the
[performance skill](../performance/SKILL.md).
