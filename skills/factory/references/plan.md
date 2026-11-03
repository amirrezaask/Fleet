# Plan: write the implementation plan agents build from

Goal: a `PLAN.md` complete enough that an agent who never saw the conversation
can implement and test the change in one pass. The plan is for agents; be explicit
and verbose where it removes guessing. Plan in read-only mode: inspect the code,
change nothing.

## Inputs

Read `INTENT.md`, `DESIGN.md` and its artifacts, the affected area specs and
workflows, and the implementation. Use qualified references (`INTENT:R1`,
`DESIGN:D2`, `areas/identity.md#AUTH-003`, or a legacy spec's own ID) so IDs from
different documents are not confused. Never restate or redefine requirements in the
plan; link them. List preserved requirements next to the new behavior.

## Contents

Use the [plan template](../templates/PLAN_TEMPLATE.md):

- **Current state:** behavior, relevant paths and their responsibilities, interfaces,
  dependencies and evidence. For a bug: reproduction, expected and actual result,
  and known or suspected cause.
- **Approach:** the chosen design at code level, data flow, interfaces and contracts,
  edge cases, and migration, rollback and compatibility where relevant.
- **Files that change:** every path to add, edit or delete, and why.
- **Work:** ordered steps (`M1`, `M2`, ...) cut by independently checkable result. Each
  states paths, dependencies, interface contracts and an observable done condition.
  Prefactoring comes first as its own step.
- **Test plan, decided up front.** One row per test (`T1`, `T2`, ...): what it proves
  (the `R`, `D` or risk ID), level (unit, integration, e2e, visual, manual), the file
  or procedure, the exact command, the pass condition, and its **tier**:
  - `fast`: runs in seconds to a minute with one command. Build writes these and
    keeps them green; Verify only re-runs them as regression.
  - `heavy`: e2e, browser, load, performance, cross-platform, long suites. Runs only
    last, at the end of `/factory build`.

  Every requirement has at least one test. Tests prove behavior and meaningful failure
  modes, not code structure. For a bug, `T1` is the reproducing test, written and
  committed first; it must fail before the fix for the expected reason.
- **Risks:** what the change could break, with mitigation and the test that catches it.
- **Interrogation:** answer in the plan: What could this break? Which step is
  riskiest, and why? Which options were rejected, and why? What can't be verified
  locally?
- **Handoff:** starting revision, workspace state, prerequisites, decisions the
  implementer must preserve, open questions, first action.

Name decisions another agent cannot safely infer. Avoid both generic steps such as
"handle edge cases" and full implementation bodies pasted into the plan. Choose TDD
where it helps; Factory does not impose it on every change.

## Self-check (the plan's gate)

Before committing, confirm:

- Every intent requirement and design decision maps to work and to at least one test.
- The dependency order is valid and interfaces are compatible.
- Every command in the test plan exists or is created by a named step, and runs locally
  or is marked as not runnable here with the reason.
- No open question blocks a step.

Commit `PLAN.md` and set the stage to `build`. The user may ask to review the plan;
otherwise no human approval is needed. When the user authorizes subagents for the build,
give each a bounded deliverable with pointers to the intent, design, plan rows,
interfaces and the fast tests it owns.

## Revisions

The plan is mutable. When building reveals a better route, revise the plan **in the
same commit** as the code that departs from it, recording date, reason, affected IDs
and impact. Recheck coverage after revising. Requirement or design conflicts need
the user's authorization; implementation freedom does not cover the contract.

These practices draw on
[Superpowers planning](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md),
[Spec Kit](https://github.github.com/spec-kit/), the current-versus-proposed split of
[OpenSpec](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md),
and plan mode in the
[AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook).
