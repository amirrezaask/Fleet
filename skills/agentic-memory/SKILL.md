---
name: agentic-memory
description: The agent-agnostic memory vault at ~/.agents (an Obsidian vault and a Git repository) that every agent shares. Use at the start of any task to recall what is known with `recall`, whenever a project rule or decision is made, and whenever a task needs documents (intent, design, plan, debrief, review).
---

# Agentic memory

`~/.agents` is one vault shared by every agent (Claude Code, Codex, Cursor, ...) and
by ADMIN in Obsidian. It is plain Markdown in one Git repository: no server, plugin or
MCP is needed, only file access and the `recall` and `tasks-index` commands on PATH.
Git is the backup and the history.

```text
~/.agents/
  AGENTS.md                      # global rules (linked from the AGENTS.md repo)
  MEMORY.md                      # long-term memory: ADMIN's, like a global AGENTS.md
  projects/<project>/            # <project> = main checkout path relative to home, e.g. dev/GameBox
    MEMORY.md                    # the project's rules and decisions
    TASKS.md                     # generated index: one line per task
    tasks/<NNN>-<task-name>/     # one task: TASK.md plus the documents it needs
  skills/  tools/                # installed by tools, not tracked by the vault
```

## Recall

At the start of a task, run `recall <keywords>` with the words that name the work
(feature, area, tool, file). It prints the matching bullets and paragraphs of
`~/.agents/MEMORY.md` and the current project's `MEMORY.md` and `TASKS.md`, best
first, each as `<file>:<line> › <headings>`; `recall <keywords> --all` searches every
project. Run it from the project's checkout or worktree, or anywhere under its
`projects/` folder. Open the files it names for the full context.

A memory reflects what was true when written: verify a file, flag or command it names
before relying on it, and fix or remove the bullet when it is wrong.

## Long-term memory: `~/.agents/MEMORY.md`

ADMIN's file: who ADMIN is, preferences and rules for every project. Write to it only
when ADMIN explicitly asks ("remember this", "add to memory"), as one bullet under the
heading it belongs to.

## Project memory: `projects/<project>/MEMORY.md`

The project's rules and decisions that its repository does not record, from
[the template](templates/PROJECT_MEMORY_TEMPLATE.md): a `## Rules` and a `## Decisions`
section, one bullet each, so `recall` returns each one whole.

- Add a rule when ADMIN states one for the project; add a decision when a task settles
  one, dated, with why and the alternative rejected, linked to the task's debrief.
- When a rule or decision changes, replace its bullet instead of adding a second one;
  Git keeps the old text. Delete bullets that are no longer true.
- Keep it to what a future agent needs before touching the project: no progress notes,
  no task state (that is `TASK.md`), nothing the code, its docs or AGENTS.md already say,
  no secrets, credentials or other people's personal data.

## Tasks

A task is `projects/<project>/tasks/<NNN>-<task-name>/`, with `<NNN>` the next
three-digit number in that folder. Claim it with `mkdir` (no `-p`): if the directory
exists, another agent took the number, so take the next one. The name never changes.

`TASK.md` (from [the template](templates/TASK_TEMPLATE.md)) holds the frontmatter
(`title`, `created`, `updated`, `status: backlog | inprogress | blocked | done`,
`branch`) and a short current state. There are no stages and no gates: write only
the documents the work needs, sized to the task.

| Document | Write it when | Template |
| --- | --- | --- |
| `INTENT.md` | The request has requirements worth agreeing on; ADMIN approves it before code | [intent](templates/INTENT_TEMPLATE.md) |
| `DESIGN.md` + `design/` | A product or architecture decision is open | [design](templates/DESIGN_TEMPLATE.md) |
| `PLAN.md` | The work has more than a few steps or will be split between agents | [plan](templates/PLAN_TEMPLATE.md) |
| `DEBRIEF.md` | The work is done: what was built, what was decided and why, follow-ups | [debrief](templates/DEBRIEF_TEMPLATE.md) |
| `REVIEW.md` | Verification ran: gates, evidence and reviewer verdicts | [review](templates/REVIEW_TEMPLATE.md) |

A one-line fix needs only `TASK.md`, or no task at all. Subtasks are
`<task>/subtasks/<NNN>-<name>/` with the same files. Raw output (logs, screenshots,
traces) goes in the task's `evidence/` folder, which Git ignores. Project
specifications stay in the project's own `docs/` ([area](templates/AREA_TEMPLATE.md),
[workflow](templates/WORKFLOW_TEMPLATE.md) templates).

`TASKS.md` is generated, never edited: after creating a task, adding a document or
changing a `status`, run `tasks-index` (or `tasks-index <project>`) and commit
`TASKS.md` with the task.

## Writing to the vault

- Links are relative Markdown links to the file, so they work in Obsidian,
  in `md <file.md>` and on any Git host.
- Commit only the paths you changed, so concurrent agents never sweep up each other's
  edits; retry when `index.lock` is held:
  `git -C ~/.agents add -- <paths> && git -C ~/.agents commit -q -m "<message>" -- <paths>`.
- Code is committed in the project's own repository and worktree, never in the vault.
