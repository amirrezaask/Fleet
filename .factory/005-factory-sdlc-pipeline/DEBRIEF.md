# Factory pipeline build debrief

Debrief · build of [PLAN.md](PLAN.md) · created 2026-11-02 17:05 · Claude Code claude-opus-5-5

## Summary

All of M1–M6 landed on `feat-factory-sdlc-pipeline`. Factory is now opt-in and runs Intent → Design → Plan → Build → Test through six commands. A subagent built M5 (board and installer) in parallel, on files separate from the doc work.

## Against the plan

| Step | Result | Deviation and reason |
| --- | --- | --- |
| M1 | Done | WebFetch would only return a summary of the article, so the full text came from the page HTML (curl plus a tag strip, kept in the session scratchpad). |
| M2–M4, M6 | Done | The task documents were written during the build, not before it. Bootstrapping a pipeline while it is being redefined made strict order impractical. |
| M5 | Done | The board also shows a stage badge. Missing DESIGN or DEBRIEF files render "Not written yet" rather than an error. |

## Abnormalities

- A heredoc command in the nu shell hung until it timed out, although its work had finished. The files were written correctly.
- The subagent's backup copy failed because `.work/` did not exist yet. HEAD's `index.html` then overwrote its edits, and it reapplied them.
- `npm run lint` fails on the base revision too: `oxfmt` flags `tools/session-budget-hook.ts`, and the UI anti-slop check reports 6 errors. Both counts match on base and branch.

## Traps and lessons

- Hosts turn only skill names into slash commands, so each stage command needs its own skill directory. Keep those directories thin and point them at `skills/factory/`.
- The installer links every `skills/*` directory automatically. A renamed template alias needs a retirement rule, or a dangling link is left behind in `~/.claude`.

## Memory candidates

- None applied. Proposal: the user's uncommitted line on master ("When an agent picks a task, it should make the task in progress") is now part of the Factory skill's task rules.

## Fast tests

| Test IDs | Command | Revision | Result |
| --- | --- | --- | --- |
| T1 | `npm run check:skills` | working tree | Passed, 11 skills |
| T2 | `npm test` | working tree | Passed, 35/35 |
| T3 | `npm run check:types` | working tree | Passed |
| T8 | `npm run lint` | working tree | Failed, with the same failures as base (no new ones) |

## Out-of-scope findings

- The base revision already fails lint (see Abnormalities). No task was created; the user can decide whether to fix it.
