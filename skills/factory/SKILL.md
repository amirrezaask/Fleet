---
name: factory
description: Opt-in software delivery pipeline Intent → Design → Plan → Build → Review with committed Markdown task documents and the local task board. Run only when the user types /factory, optionally with a stage subcommand (/factory intent|design|plan|build|review|next); never start it from an inferred trigger.
disable-model-invocation: true
---

# Factory

Factory is an **opt-in** delivery pipeline. It runs only when the user types
`/factory`, with or without a subcommand. Without a command, handle coding requests directly
and create no Factory task. Research discussions, status questions and document
viewing never authorize implementation.

## The task store

`<factory>` is the project's task store, `~/.agents/factory/<project>/`: outside the
repository, one live copy shared by every worktree, agent and the board. Task documents
are written only there; read [the task store](references/tasks.md#the-task-store) first.

## Commands

Factory is one command, `/factory`, with an optional stage subcommand.

| Command | Accepts on entry | Does | Ends when |
| --- | --- | --- | --- |
| `/factory [request or task]` | — | Router: find or create the task, report its stage, run stages forward | It stops at each human gate |
| `/factory next` | `<factory>/backlog.md` | Take the first open backlog line, claim it, and run `/factory intent` on it; see [backlog](references/backlog.md) | The intent stops at its approval gate |
| `/factory intent [request]` | — | Create `<factory>/<NNN>-<name>/` under the [shared lock](references/tasks.md#creating-a-task-one-lock-one-commit) or reuse the named task; follow [intent](references/intent.md) | The user approves `INTENT.md` and it is committed |
| `/factory design [task]` | `INTENT.md` | Follow [design](references/design.md): write `DESIGN.md` and `design/` | The user accepts the design and it is committed |
| `/factory plan [task]` | `DESIGN.md` or the recorded skip | Follow [plan](references/plan.md) read-only: change no code | `PLAN.md` passes its self-check and is committed |
| `/factory build [task]` | — | Follow [build](references/build.md): implement, keep fast tests green, then verify with heavy gates last (managing agent only) | The scope is implemented, regression and acceptance pass, heavy gates pass, `DEBRIEF.md` and `REVIEW.md` are committed |
| `/factory review [task]` | `REVIEW.md` | Managing agent only; follow [review](references/review.md): four parallel reviewers (code, security, UI, UX) | All reviewers return `VERDICT: PASS` within 3 rounds, `REVIEW.md` has the review, specs are committed with status `done`; or the cap is hit and status is `blocked` |

The first word after `/factory` is a subcommand only when it is exactly `next`, `intent`,
`design`, `plan`, `build` or `review`; anything else goes to the router. A subcommand
names the task by directory name, number or slug (`intent` may instead describe a new
request); without one, use the only `inprogress` task, or ask. Running a subcommand
records the acceptance of the previous artifact if missing, and sets
`status: inprogress` and `stage: <subcommand>` in `TASK.md`. It runs only its own
stage, except that a skipped unfinished earlier stage runs first (`/factory build`
without a plan plans first) unless the user said to skip it. It ends with a commit
of the stage's artifact and tells the user the next command.

## Pipeline

| Stage | Guide | Artifact | Main reader | Gate to leave the stage |
| --- | --- | --- | --- | --- |
| Intent | [intent](references/intent.md) | `INTENT.md` | The user: one screen | **The user approves the intent** |
| Design | [design](references/design.md) | `DESIGN.md`, `design/` | The user reviews | **The user accepts the design**, or the intent says it is skipped |
| Plan | [plan](references/plan.md) | `PLAN.md` | Implementing agents: verbose | Agent self-check: coverage and interrogation |
| Build | [build](references/build.md) | Code, tests, `DEBRIEF.md`, `REVIEW.md` | Future agents; the user reads the verdict | Fast tests green, then regression, acceptance and heavy gates (last) pass |
| Review | [review](references/review.md) | Review section of `REVIEW.md` | The user: verdict first | Code, security, UI and UX reviewers pass and specs match the verified behavior |

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
them rendered with `md <file>`. Legacy tasks keep their files and stay readable:
`TASK.html`, `INTENT.html`, `PLAN.html`, `DEBRIEF.html`, `REPORT.html`, and
`BRIEF.html`/`BRIEF.md` as the intent. New documents are always Markdown; when both
formats exist the `.md` is canonical. Every new debrief is `DEBRIEF.md` from the
debrief template, including one for work done without the pipeline.

## Tasks

A task is one directory, `<factory>/<NNN>-<task-name>/`, numbered `001`, `002`, ... in creation order, whose name never changes. It holds
`TASK.md`, its stage documents and `REVIEW.md` (older tasks: `REPORT.md`), its `design/` folder and its
`subtasks/` folder. `<factory>/` lists every task. `TASK.md`
records the state in frontmatter: `status:` is `backlog`, `inprogress`,
`blocked` or `done`, and `stage:` is
`intent`, `design`, `plan`, `build`, `review` or `done`. Read
[task layout and board](references/tasks.md) for naming, metadata and the board.

`/factory intent` creates `<factory>/<NNN>-<name>/` (the next free number) with `TASK.md` from the
[task template](templates/TASK_TEMPLATE.md), status `backlog`. **When an agent picks
a task up, it sets `status` to `inprogress`** and updates `stage` and `updated`. It
sets `backlog` when it stops between stages with no work in flight, `blocked` with the
reason when a decision or dependency stops it, and `done` only when Review passes.
Nothing is renamed, so links and worktrees stay valid.

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
silently. Record it in the debrief or report, and when it deserves work, append it as
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

Cheap checks run continuously while building; heavy gates run once, as the last step
of Build, on the whole task, so development and building stay fast. Subagents that
implement part of a task run only the fast tests their plan names. Only the managing
agent runs heavy gates, and only when the scope is complete and it intends to close the
task. Review re-runs a heavy gate only when a fix could have changed its result. Implement everything the plan specifies before spending time on
validation.

## Specifications

Read the project's specs under `docs/` before writing an intent, design or plan, and
update them with verified behavior when Review closes the task. Follow
[keeping specifications true](references/specifications.md).

## Resume

On resume, read `TASK.md`, the stage documents, the relevant specs and the actual
Git diff, and continue from the recorded stage. Chat history alone is not enough.
Keep status in `TASK.md`, decisions in the stage documents,
and results in the debrief and report (review findings included); create no parallel progress logs. The
optional board changes task metadata only; it never starts agents. Every project carries its own read-only
[board](references/tasks.md#per-repository-board) (`tools/factory-board/`, launched with
`npm run factory:board`); install or refresh that copy whenever Factory starts in a project.
