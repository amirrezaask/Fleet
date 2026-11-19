---
name: agentic-memory
description: The agent-agnostic memory vault at ~/.agents (an Obsidian vault and a Git repository) that every agent shares. Use at the start of any task to recall what is known, whenever a fact about ADMIN, their feedback or a project is worth remembering, and whenever a task needs documents (intent, design, plan, debrief, review).
---

# Agentic memory

`~/.agents` is one vault shared by every agent (Claude Code, Codex, Cursor, ...) and
by ADMIN in Obsidian. It is plain Markdown in one Git repository: no server, plugin or
MCP is needed, only file access. Git is the backup and the history.

```text
~/.agents/
  AGENTS.md                      # global rules (linked from the AGENTS.md repo)
  memory/
    MEMORY.md                    # the index: one line per memory, read first
    <slug>.md                    # one fact per note
  projects/<project>/            # <project> = main checkout path relative to home, e.g. dev/GameBox
    README.md                    # optional: what the project is, links to notes and tasks
    tasks/<NNN>-<task-name>/     # one task: TASK.md plus the documents it needs
  skills/  tools/                # installed by tools, not tracked by the vault
```

## Recall

At the start of a task, read `memory/MEMORY.md` and open the notes whose line is
relevant. For project work, also list `projects/<project>/tasks/` and read the
`TASK.md` of related tasks. A memory reflects what was true when written: verify a
file, flag or command it names before relying on it.

## Memories

One fact per note in `memory/<slug>.md`, `<slug>` in lowercase kebab-case:

```markdown
---
name: <slug>
description: <one line, used to decide relevance>
type: user | feedback | project | reference
project: <project>        # only when the fact belongs to one project
updated: "<YYYY-MM-DD>"
---

<The fact. For feedback and project notes, add **Why:** and **How to apply:** lines.
Link related notes with relative Markdown links.>
```

- `user`: who ADMIN is and their preferences. `feedback`: how to work, corrections
  and confirmed approaches. `project`: goals, constraints and decisions that the code
  and Git history do not show. `reference`: pointers to external resources.
- Then add or update its line in `MEMORY.md`: `- [Title](<slug>.md) — <hook>`.
- Before adding, search `memory/` for a note that covers it and update that note
  instead. Delete a note that turned out wrong, and its index line.
- Do not save what the repository already records (code structure, past fixes,
  CLAUDE.md or AGENTS.md rules), what matters only to this conversation, secrets,
  credentials or personal data of anyone other than ADMIN.

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

## Writing to the vault

- Links are relative Markdown links to the file, so they work in Obsidian,
  in `md <file.md>` and on any Git host.
- Commit only the paths you changed, so concurrent agents never sweep up each other's
  edits; retry when `index.lock` is held:
  `git -C ~/.agents add -- <paths> && git -C ~/.agents commit -q -m "<message>" -- <paths>`.
- Code is committed in the project's own repository and worktree, never in the vault.
