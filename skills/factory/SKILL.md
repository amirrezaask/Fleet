---
name: factory
description: Opt-in software delivery pipeline Intent → Design → Plan → Build → Review with committed Markdown task documents. Run only when the user types /factory, optionally with a stage subcommand (/factory intent|design|plan|build|review|next); never start it from an inferred trigger.
disable-model-invocation: true
---

# Factory

Factory is an **opt-in** delivery pipeline. It runs only when the user types
`/factory`, with or without a subcommand. Without a command, handle coding requests directly
and create no Factory task. Research discussions, status questions and document
viewing never authorize implementation.

## The task store

`<factory>` is the project's task store, `~/.agents/projects/<project>/` in the agent
memory vault: outside the repository, one live copy shared by every worktree and agent.
Task documents are written only there, in `<factory>/tasks/`; read
[the task store](references/tasks.md#the-task-store) first.

## Commands

| Command | Needs | Does | Ends when |
| --- | --- | --- | --- |
| `/factory [request or task]` | — | Router: find or create the task, report its stage, run stages forward | It stops at each human gate |
| `/factory next` | `<factory>/backlog.md` | Take the first open backlog line, claim it, and run `/factory intent` on it; see [backlog](references/backlog.md) | The intent stops at its approval gate |
| `/factory intent [request]` | — | Create `<factory>/tasks/<NNN>-<name>/` under the [shared lock](references/tasks.md#creating-a-task-one-lock-one-commit) or reuse the named task; follow [intent](references/intent.md) | The user approves `INTENT.md` and it is committed |
| `/factory design [task]` | `INTENT.md` | Follow [design](references/design.md): write `DESIGN.md` and `design/` | The user accepts the design and it is committed |
| `/factory plan [task]` | `DESIGN.md` or the recorded skip | Follow [plan](references/plan.md) read-only: change no code | `PLAN.md` passes its self-check and is committed |
| `/factory build [task]` | `PLAN.md` | Follow [build](references/build.md): implement, keep fast tests green, then verify with heavy gates last (managing agent only) | The scope is implemented, regression and acceptance pass, heavy gates pass, `DEBRIEF.md` and `REVIEW.md` are committed |
| `/factory review [task]` | `REVIEW.md` | Managing agent only; follow [review](references/review.md): four parallel reviewers (code, security, UI, UX) | All reviewers return `VERDICT: PASS` within 3 rounds, specs are committed and `REVIEW.md` records `**Review verdict:** PASS`; or the cap is hit and it records `Blocked` |

The first word after `/factory` is a subcommand only when it is exactly `next`, `intent`,
`design`, `plan`, `build` or `review`; anything else goes to the router. A subcommand
names the task by directory name, number or slug (`intent` may instead describe a new
request); without one, use the only task that is not `done`, or ask. Running a subcommand
records the acceptance of the previous artifact if missing. It runs only its own
stage, except that a skipped unfinished earlier stage runs first (`/factory build`
without a plan plans first) unless the user said to skip it. It ends with a commit
of the stage's artifact and tells the user the next command.

## Pipeline

**Every stage ends with a commit** of its artifact in the task store, and the next stage starts by
reading it. The commit chain is the audit trail: what was asked, what was decided,
what was built, and what was proven. Commit messages name the task and stage
(`factory(<task>): design`) and reference `INTENT.md` and `PLAN.md` once they exist.

**Gates.** The user running the next stage's subcommand accepts the previous artifact.
Record that acceptance in the artifact's approval entry with the date. `/factory`
stops at the two human gates and asks; it continues without stopping only when the
user's message explicitly says so ("run the whole pipeline, don't stop after
design"). Intent approval is never assumed: when the user gave a complete request
and an explicit go-ahead in one message, record that message as the approval. The
plan has no human gate. Nothing is implemented before a committed plan.

**Proportionality.** Every task gets an intent and a plan. Design is skipped when no
product or architecture decision is open (an isolated bug fix, a mechanical change);
record "Design: skipped, &lt;reason&gt;" in `INTENT.md`.

## Documents and audience

Write each document for whoever reads it next. Documents for the user are short;
documents for agents are complete.

- **`INTENT.md`** (the user): problem, outcome, requirements with stable `R` IDs,
  non-goals, constraints, open questions. One screen. No implementation detail.
- **`DESIGN.md`** (the user reviews): flagged concerns first, then decisions with
  the rejected alternatives, then links into the task's `design/` folder (mocks,
  diagrams, prototypes, images). Keep the page short; the artifacts carry the detail.
- **`PLAN.md`** (agents): everything an implementer without this conversation needs:
  current state, files, order of work, interfaces, the **test plan**, risks and the
  interrogation. Verbosity helps here.
- **`DEBRIEF.md`** (future agents and engineers): how the build went, deviations,
  abnormalities, traps and lessons. Factual and complete.
- **`REVIEW.md`** (the user first, auditors after): verdict and requirement matrix on
  the first screen, evidence below.

All documents are Markdown from the [templates](templates/); the user reviews any of
them rendered with `md <file>`. Legacy HTML task documents, `REPORT.*` and
`BRIEF.*` (read as the intent) stay readable in place; new documents are always
Markdown, and when both formats exist the `.md` is canonical.

## Tasks

A task is one directory, `<factory>/tasks/<NNN>-<task-name>/`, numbered in creation
order, whose name never changes. It has no metadata file: its **stage** is read from the
documents it holds (`INTENT.md` → `intent`, `DESIGN.md` → `design`, `PLAN.md` → `plan`,
`DEBRIEF.md` or `REVIEW.md` → `build`), and it is `done` only when `REVIEW.md` records
`**Review verdict:** PASS`. Read [task layout](references/tasks.md) for naming, task
creation and [how a task's state is read](references/tasks.md#reading-a-tasks-state).

A decision or dependency that stops the work is recorded, dated and with its reason, in
the document of the stage it stops, and reported to the user. Nothing is renamed, so
links and worktrees stay valid.

**Requirements are a contract.** Agents may change the plan's steps, interfaces,
order or approach whenever all intent requirements, the accepted design and existing
specs remain satisfied, recording each material revision in `PLAN.md`. They never
remove, weaken or reinterpret a requirement or an accepted design decision. A
conflict needs the user's explicit authorization, recorded as an amendment entry in
the affected document, with the earlier text kept in Git.

**The backlog.** `<factory>/backlog.md` is the user's queue of requests that have no task
yet: one line each, no ceremony. `/factory next` turns the first open line into a task
and the pipeline runs as usual. Read [backlog](references/backlog.md).

**The loop.** A finding outside the task's scope (a bug, a risk, a debt) is not fixed
silently. Record it in `DEBRIEF.md` or `REVIEW.md`, and when it deserves work, append it as
an open line to `<factory>/backlog.md`. It enters the pipeline when `/factory next`
reaches it or the user runs `/factory intent` on it.

## Subtasks

Split a task when parts can be planned, built and tested separately. A subtask is a
directory `<task>/subtasks/<NNN>-<subtask-name>/`, numbered within its parent, with the same files, nests without limit,
and refines its parent: its intent needs no approval from the user ("Approval: not
required, subtask of `<parent>`"), may add detail and `R` IDs, and never weakens a
parent requirement. A parent becomes `done` only after every descendant is done and
its own Review passes. Read [subtask graphs](references/subtasks.md) to cut vertical
slices, record dependencies and build the ready subtasks in parallel.

## Validation budget

Implement everything the plan specifies before spending time on validation. Cheap
checks run continuously while building; heavy gates run once, as the last step of
Build, on the whole task. Subagents that implement part of a task run only the fast
tests their plan names. Only the managing agent runs heavy gates, and Review re-runs
one only when a fix could have changed its result.

## Specifications

Read the project's specs under `docs/` before writing an intent, design or plan, and
update them with verified behavior when Review closes the task. Follow
[keeping specifications true](references/specifications.md).

## Resume

On resume, read the stage documents, the relevant specs and the actual Git diff, and
continue from the stage the documents show. Chat history alone is not enough. Keep
decisions in the stage documents, and results in `DEBRIEF.md` and `REVIEW.md`; create
no parallel progress logs.
