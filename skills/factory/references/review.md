# Review: four independent reviewers, then close

Goal: independent eyes on the whole change from four aspects (**code**, **security**,
**UI**, **UX**) before the task closes. Build has already proven the behavior
(regression, acceptance, heavy gates); Review judges quality and risk. Only the
managing agent runs this stage.

## Run the reviewers

Run the reviewers exactly as the [change-review skill](../../change-review/SKILL.md)
defines them: four fresh subagents in parallel, one per lens, each reporting only and
replying with a `VERDICT: PASS` or `VERDICT: CHANGES` line first. That skill owns the
lenses, the reply format and the rule that a round is complete only when every started
reviewer has replied. Factory adds:

- **Pointers.** Each reviewer gets `INTENT.md`, `DESIGN.md` (and its `design/` mocks),
  `PLAN.md`, `DEBRIEF.md`, `REVIEW.md`, the project's `AGENTS.md`/`CLAUDE.md`, and the
  diff against the base revision (`git diff <base>...HEAD`). The code reviewer also
  checks that the diff matches the intent, design and plan, and the plan matches the diff.
- **No heavy gates.** Reviewers do not re-run them; the results are in `REVIEW.md`.
- **Skipped lenses** are recorded in `REVIEW.md` as "Skipped: no UI".
- **A reviewer that fails twice** (no verdict line on the re-run) blocks the task:
  record `**Review verdict:** Blocked: <reason>` in `REVIEW.md`.

No custom agent definitions are needed: spawn each reviewer with the generic subagent
and its lens, so the stage works in any host.

## Resolve

1. Read every finding yourself and verify it before acting; reject wrong ones with the
   reason.
2. Fix each verified `Important` finding in the code (one fresh implementer subagent
   may do a batch); a finding that conflicts with a requirement or accepted design
   decision stops for the user. Fix or consciously accept `Nit`s. When a fix changes the
   approach, revise `PLAN.md` with the fix and add the incident to `DEBRIEF.md`.
3. Re-run the affected fast tests, and the heavy gates a fix could have changed, then
   run the reviewers that raised `Important` findings again as the next round. Repeat
   until all started reviewers return `VERDICT: PASS` or the user accepts the
   remainder as a known limitation.

**Round cap: `MAX_ROUNDS = 3`.** The first run is round 1; at most two fix rounds
follow. If any reviewer still returns `VERDICT: CHANGES` after round 3, escalate
instead of looping: set `**Review verdict:** Blocked: review rounds exhausted` in
`REVIEW.md`, record the outstanding `Important` findings (reviewer, location, problem)
in the Review section of `REVIEW.md` and `DEBRIEF.md`, keep the branch and worktree
for inspection, commit, and report the task as blocked. Do not wait for the user to
answer; they unblock it by accepting the findings, amending the requirement or design,
or running `/factory review` again, which starts a fresh cap of three rounds.

## Record and close

Fill the **Review** section of `REVIEW.md`, one subsection per reviewer (Code,
Security, UI, UX) from the [review template](../templates/REVIEW_TEMPLATE.md): its
verdict (the same `PASS`/`CHANGES` word as its verdict line, per round) and each finding with its resolution (fixed in `<sha>`, accepted by the user,
rejected because), or "Skipped: <reason>". Then:

1. Update the affected specs from the verified behavior
   ([specification integration](specifications.md)).
2. Out-of-scope findings worth doing are appended to `<factory>/backlog.md`.
3. A memory candidate from the debrief that recurred here is proposed to the user as a
   concrete `AGENTS.md`/`CLAUDE.md` or skill edit.
4. Remove the task's worktrees with `git worktree remove`, set
   `**Review verdict:** PASS` in `REVIEW.md`, run `tasks-index`, and commit.

A `PASS` review verdict requires: all requirements evidenced, every gate passed or explicitly
accepted by the user as a known limitation, all four reviewers `PASS` (or their
findings resolved or accepted), `DEBRIEF.md` and `REVIEW.md` present, and specs matching the
verified behavior. A task with a `PASS` verdict without that evidence is reported and
reconciled before anyone claims success.
