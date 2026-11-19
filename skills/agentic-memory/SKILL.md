---
name: agentic-memory
description: The agent-agnostic memory vault at ~/.agents (an Obsidian vault and a Git repository) that every agent shares. Use at the start of any task to read the memory index and `recall` what is known, whenever something is worth remembering across sessions, and whenever a task needs documents (intent, design, plan, debrief, review).
---

# Agentic memory

`~/.agents` is one vault shared by every agent (Claude Code, Codex, Cursor, ...) and
by ADMIN in Obsidian. It is plain Markdown in one Git repository: no server, plugin or
MCP is needed, only file access and the `recall` and `tasks-index` commands on PATH.
Git is the backup and the history.

```text
~/.agents/
  AGENTS.md                      # global rules (linked from the AGENTS.md repo)
  memory/                        # the one memory every agent shares
    MEMORY.md                    # index: one line per memory
    <memory-name>.md             # one memory per file
  projects/<project>/            # <project> = main checkout path relative to home, e.g. dev/GameBox
    TASKS.md                     # generated index: one line per task
    tasks/<NNN>-<task-name>/     # one task: TASK.md plus the documents it needs
  skills/  tools/                # installed by tools, not tracked by the vault
```

## Memory

`~/.agents/memory/` uses Claude Code's auto-memory format, so every agent reads and
writes the same files. Claude Code loads `memory/MEMORY.md` into every session by
itself (`autoMemoryDirectory`, and each `~/.claude/projects/*/memory` is a link to this
folder); every other agent reads `~/.agents/memory/MEMORY.md` at the start of a session.

Each memory is one file holding one fact, with frontmatter:

```markdown
---
name: <short-kebab-case-slug>
description: <one-line summary, used to decide relevance during recall>
metadata:
  type: user | feedback | project | reference
---

<the fact; for feedback and project memories, follow with **Why:** and **How to apply:** lines.
Link related memories with [[their-name]].>
```

- `user`: who ADMIN is: role, expertise, preferences.
- `feedback`: guidance ADMIN gave on how to work, corrections and confirmed approaches,
  with the reason.
- `project`: ongoing work, goals or constraints the code and its history do not show;
  write absolute dates, never "today" or "next week".
- `reference`: pointers to outside resources such as URLs, dashboards and tickets.

After writing the file, add one line to `memory/MEMORY.md`:
`- [Title](<file name>) — hook`. Put a memory that belongs to one project under that
project's `## <project>` heading and name the project in its `description`. The index is
loaded into every Claude session, so it holds pointers only, never memory content.

- Before saving, look for a memory that already covers the fact: update that file
  instead of writing a duplicate, and delete memories that turn out to be wrong.
- Do not save what the repository already records (code structure, past fixes, Git
  history, AGENTS.md), what matters only to the current conversation, task state (that
  is `TASK.md`), secrets, credentials or other people's personal data. When ADMIN asks to
  remember one of those, ask what was non-obvious about it and save that.
- A memory reflects what was true when written. Before relying on a file, flag or
  command it names, check that it still exists, and fix the memory when it is wrong.

## Recall

At the start of a task, run `recall <keywords>` with the words that name the work
(feature, area, tool, file). It prints the matching bullets and paragraphs of every
memory and of the current project's `TASKS.md`, best first, each as
`<file>:<line> › <memory or headings>`; `--all` adds every project's `TASKS.md`. Run it
from the project's checkout or worktree, or anywhere under its `projects/` folder. Open
the files it names for the full context.

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
