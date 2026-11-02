---
name: factory
description: Opt-in software delivery pipeline Intent → Design → Plan → Build → Test with committed HTML task documents and the local task board. Run only when the user types /factory or a /factory-<stage> command; never start it from an inferred trigger.
disable-model-invocation: true
---

# Factory

Factory is an **opt-in** delivery pipeline. It runs only when the user types
`/factory` or a stage command. Without a command, handle coding requests directly
and create no Factory task. Research discussions, status questions and document
viewing never authorize implementation.

## Commands

| Command | Does |
| --- | --- |
| `/factory [request or task]` | Router: find or create the task, report its stage, run stages forward and stop at each human gate |
| `/factory-intent [request]` | Capture intent: clarify with the user, write `INTENT.html` |
| `/factory-design [task]` | Accept the intent, then write `DESIGN.html` and the `design/` artifacts |
| `/factory-plan [task]` | Accept the design, then write the agent-facing `PLAN.html` with its test plan |
| `/factory-build [task]` | Implement the plan, keep its fast tests green, write `DEBRIEF.html` |
| `/factory-test [task]` | Run the gates: regression, acceptance, review, heavy checks; write the report, close the task |

A stage command names the task by name (without the status suffix). Without one,
use the only `-inprogress` task, or ask. If a command skips an unfinished earlier
stage, run that stage first (`/factory-build` on a task without a plan plans first),
unless the user said to skip it.

## Pipeline

| Stage | Guide | Artifact | Main reader | Gate to leave the stage |
| --- | --- | --- | --- | --- |
| Intent | [intent](references/intent.md) | `INTENT.html` | The user: one screen | **The user approves the intent** |
| Design | [design](references/design.md) | `DESIGN.html`, `design/` | The user reviews | **The user accepts the design**, or the intent says it is skipped |
| Plan | [plan](references/plan.md) | `PLAN.html` | Implementing agents: verbose | Agent self-check: coverage and interrogation |
| Build | [build](references/build.md) | Code, tests, `DEBRIEF.html` | Future agents and engineers | Every fast test in the plan passes |
| Test | [test](references/test.md) | `REPORT.html` | The user: verdict first | All gates pass and specs match the verified behavior |

**Every stage ends with a commit** of its artifact, and the next stage starts by
reading it. The commit chain is the audit trail: what was asked, what was decided,
what was built, and what was proven. Commit messages name the task and stage
(`factory(<task>): design`) and reference `INTENT.html` and `PLAN.html` once they exist.

**Gates.** The user running the next stage's command accepts the previous artifact.
Record that acceptance in the artifact's approval entry with the date. `/factory`
stops at the two human gates and asks; it continues without stopping only when the
user's message explicitly says so ("run the whole pipeline, don't stop after
design"). Intent approval is never assumed: when the user gave a complete request
and an explicit go-ahead in one message, record that message as the approval. The
plan has no human gate, but the user may ask to review it. Nothing is implemented
before a committed plan.

**Proportionality.** Every task gets an intent and a plan. Design is skipped when no
product or architecture decision is open (an isolated bug fix, a mechanical change);
record "Design: skipped, &lt;reason&gt;" in `INTENT.html`.

## Documents and audience

Write each document for whoever reads it next. Documents for the user are short;
documents for agents are complete.

- **`INTENT.html`** (the user): problem, outcome, requirements with stable `R` IDs,
  non-goals, constraints, open questions. One screen. No implementation detail.
- **`DESIGN.html`** (the user reviews): flagged concerns first, then decisions with
  the rejected alternatives, then links into the task's `design/` folder (mocks,
  diagrams, prototypes, images). Keep the page short; the artifacts carry the detail.
- **`PLAN.html`** (agents): everything an implementer without this conversation needs:
  current state, files, order of work, interfaces, the **test plan**, risks and the
  interrogation. Verbosity helps here.
- **`DEBRIEF.html`** (future agents and engineers): how the build went, deviations,
  abnormalities, traps and lessons. Factual and complete.
- **Test report** (the user first, auditors after): verdict and requirement matrix on
  the first screen, evidence below.

All documents are HTML from the [templates](templates/), which carry the Claude-style
tokens; never write Markdown. Legacy tasks keep their files: `BRIEF.html`/`BRIEF.md`
count as the intent, and a `DEBRIEF.md` counts as the debrief.

## Tasks

A task is one flat directory, `.factory/<task-name>-<status>/`, holding
`TASK.html`, its stage documents and test `REPORT.html`, its `design/` folder and
its subtask directories. `.factory/` at the project root lists every task.
`<status>` is `backlog`, `inprogress`, `blocked` or `done`: the last segment of
the name is the status. `TASK.html` records `<meta name="stage">`:
`intent`, `design`, `plan`, `build`, `test` or `done`. Read
[task layout and board](references/tasks.md) for naming, metadata and the board.

`/factory-intent` creates the task as `<name>-backlog/` with `TASK.html` from the
[task template](templates/TASK_TEMPLATE.html). **When an agent picks a task up, it
renames it to `-inprogress`** (`git mv`) and updates `stage` and `updated`. It
renames it back to `-backlog` when it stops between stages with no work in flight,
to `-blocked` with the reason when a decision or dependency stops it, and to
`-done` only when Test passes.

**Requirements are a contract.** Agents may change the plan's steps, interfaces,
order or approach whenever all intent requirements, the accepted design and existing
specs remain satisfied, recording each material revision in `PLAN.html`. They never
remove, weaken or reinterpret a requirement or an accepted design decision. A
conflict needs the user's explicit authorization, recorded as an amendment entry in
the affected document, with the earlier text kept in Git.

**The loop.** A finding outside the task's scope (a bug, a risk, a debt) is not fixed
silently. Record it in the debrief or report, and when it deserves work, create a
new `-backlog` task holding a draft `INTENT.html` marked "Draft: not approved". It
enters the pipeline when the user runs a command on it.

## Subtasks

Split a task when parts can be planned, built and tested separately. A subtask is a
child directory `<subtask-name>-<status>/` with the same files, nests without limit,
and refines its parent: its intent needs no approval from the user ("Approval: not
required, subtask of `<parent>`"), may add detail and `R` IDs, and never weakens a
parent requirement. A parent becomes `-done` only after every descendant is done and
its own Test passes. Read [subtask graphs](references/subtasks.md) to cut vertical
slices, record dependencies and build the ready subtasks in parallel.

## Validation budget

Cheap checks run continuously while building; heavy gates run once, in Test, on the
whole task. Subagents that implement part of a task run only the fast tests their
plan names. Only the managing agent runs heavy gates, and only when it intends to
close the task. Implement everything the plan specifies before spending time on
validation.

## Specifications

Read the project's specs under `docs/` before writing an intent, design or plan, and
update them with verified behavior after Test. Follow
[keeping specifications true](references/specifications.md).

## Resume

On resume, read `TASK.html`, the stage documents, the relevant specs and the actual
Git diff, and continue from the recorded stage. Chat history alone is not enough.
Keep status in the directory name and `TASK.html`, decisions in the stage documents,
and results in the debrief and report; create no parallel progress logs. The
optional board changes task metadata only; it never starts agents.
