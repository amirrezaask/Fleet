---
name: factory
description: Guide software features and bug fixes from clarification and approved briefs through implementation, verification and debriefs, integrating Atlas specifications. Use for software development work, Factory tasks, or the local task board; research discussions alone do not start implementation.
---

# Factory

Address the user as ADMIN. Factory owns the software development workflow:
**Clarify → Plan → Build and verify → Learn and adjust**.
Use existing project conventions and relevant specialist skills within this flow.
Do not turn a research discussion, status question, or document viewing request
into authorization to implement software.
When an agent picks a task, it should make the task in progress in task metadata file.

## Clarify

Read [clarification guidance](references/clarify.md) when shaping a feature or bug
fix. Inspect relevant code and area specifications before asking questions that
the repository can answer. Work through consequential gaps with ADMIN and draft
a concise brief using the [brief template](templates/BRIEF_TEMPLATE.html).
Keep the draft in the conversation until approval, unless ADMIN requests a file.

The brief records intent, observable requirements with stable IDs, non-goals,
constraints, and acceptance checks. Distinguish ADMIN's decisions from agent
assumptions. Explicit approval of the brief is required before planning and
implementation; respect approval already given in the conversation.
Do not ask whether to create a brief: it is part of Factory feature/bug work.

## Plan and create the task

After brief approval, read [planning guidance](references/plan.md) and use the
[plan template](templates/PLAN_TEMPLATE.html). A separate plan approval is not
required unless ADMIN requests it. Approval to plan alone does not authorize
implementation; follow the scope ADMIN actually requested.

Once the approved brief and plan exist, create
`docs/tasks/<status>/<task-name>/` with:

- `TASK.html`: metadata using the [task template](templates/TASK_TEMPLATE.html).
- `BRIEF.html`: the approved brief, including its approval record.
- `PLAN.html`: the implementation plan, linked to `BRIEF.html`.

`<status>` is one of `backlog`, `inprogress`, `blocked` or `done`. The directory
a task sits in is its status; there is no status field in `TASK.html`. Change status
by moving the directory (`git mv`) and updating `updated`.

**All documents are HTML.** Every new brief, plan, task, debrief and report is
written from the HTML templates, which carry the Claude-style design tokens;
never write Markdown. Projects may keep their older Markdown files (`TASK.md`,
`BRIEF.md`, `PLAN.md`, reports, specs) and keep reading them. Do not convert
them unless ADMIN requests migration. Edit a legacy task in its existing format
and create only new files as HTML.

Use a descriptive lowercase hyphenated task name and never overwrite another
task. These are the canonical task documents; do not duplicate them under
`docs/briefs/` or `docs/plans/`. Existing historical documents remain where they
are unless ADMIN requests migration. Reuse a task when resuming its work.
Read [task metadata and board](references/tasks.md) when creating or managing
tasks or installing the board. New tasks start in `backlog/`.

### Subtasks

Split a task into subtasks when it has parts that can be planned, built and
verified separately. A subtask is the same entity as a task, with the same
`TASK.html`, `BRIEF.html` and `PLAN.html`, stored in the same status layout inside its
parent: `docs/tasks/<status>/<task>/subtasks/<status>/<subtask>/`. Differences:

- ADMIN does not approve a subtask brief. The agent drafts and records it with
  "Approval: not required, subtask of `<parent>`" and proceeds.
- A subtask brief refines the parent brief; it may add detail and its own
  requirement IDs but never removes, weakens or reinterprets a parent
  requirement. Needing that still requires ADMIN's authorization on the parent.
- A parent moves to `done` only after every subtask is `done` and the parent's
  own acceptance is verified. Subtasks reuse the parent's debrief unless they
  produced findings worth their own.
- Subtasks may depend on sibling subtasks. Read [subtask graphs](references/subtasks.md)
  to cut vertical slices, record dependencies and run the ready subtasks in
  parallel with subagents.
- Nesting is recursive and unlimited: a subtask can have its own `subtasks/`,
  and those can have theirs. Every level has the same files, statuses and rules,
  and each brief refines its immediate parent's. A task moves to `done` only
  after all of its subtasks, at every depth, are done.


## Build and verify

Move the task to `inprogress/` when implementation starts. Execute the full agreed
scope in coherent increments, with focused checks where they help development.
For bugs, reproduce the failure and investigate its cause before choosing a fix.

Agents may change implementation steps, interfaces, sequencing, or technical
approach in `PLAN.html` without seeking approval when all brief and existing area
specification requirements remain satisfied. Record the date, reason, and impact
of each material revision in the plan. Never remove, edit, weaken, or silently
reinterpret requirements in the approved brief or existing area specs. A conflict
requires ADMIN's explicit authorization to amend the affected requirements;
record that authorization and preserve the earlier requirement in Git/history.
An append-only note is not a loophole for changing a requirement.

After implementing the scope, verify in this order:

1. **Regression:** existing checks and preserved behavior, identifying pre-existing
   failures separately from failures introduced by this change.
2. **Acceptance:** every brief requirement mapped to concrete observed evidence.
3. **Quality:** relevant lint, type, security, accessibility, performance, or manual
   checks proportional to the change. A passing test suite alone proves neither
   requirement coverage nor product quality.

Repair failures and repeat affected checks. Do not spend extended qualification
on a partial implementation while leaving agreed requirements unimplemented.
Record command, result, revision, and limitations; never claim an unrun check
passed. Move the task to `blocked/` when a required decision or external dependency
prevents progress and record the reason in `TASK.html`. Resume when the blocker is resolved.

## Learn and adjust

Write the debrief using the [debrief template](templates/DEBRIEF_TEMPLATE.html) at
`docs/reports/YYYY-MM-DD-<task-name>.html` and link it from `TASK.html`. It records
outcomes, plan changes, verification, remaining work, and useful unrelated
findings, separating evidence from assumptions. Keep raw output gitignored.

Then follow [specification integration](references/specifications.md) and Atlas's
targeted maintenance guidance to update affected root, area and workflow documents
with verified behavior. Atlas owns their methods, structure and templates. Do
not start a full baseline without ADMIN's `/atlas` command. Add requirements for
new behavior; existing requirements retain their meaning unless ADMIN authorized
a change.

Move the task to `done/` only after all brief requirements and required checks are
satisfied, the debrief exists, and affected specs match verified behavior.
A task's status directory is user-editable bookkeeping, not proof of completion.
If a task sits in `done/` but evidence is incomplete, report the discrepancy and reconcile it
before claiming success. Follow project commit and worktree cleanup rules.

## Resume and scope

On resume, read `TASK.html`, the approved brief, the current plan, relevant area
specs, and the actual Git diff. Reconcile implementation and verification with
those sources before choosing the next step; chat history alone is insufficient.
Keep status and blockers in `TASK.html`, revisions in `PLAN.html`, and results in the
debrief rather than creating parallel progress logs.

For standalone specification initialization, ADMIN invokes `/atlas`. For a
standalone debrief, load its template directly; a new development task is
unnecessary. Factory adds no workflow engine, evaluation harness, session
dispatcher, or unrelated tooling.
The optional local board changes task metadata only; it never starts agents.
