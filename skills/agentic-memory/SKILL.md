---
name: agentic-memory
description: The agent-agnostic memory vault at ~/.agents (an Obsidian vault and a Git repository) that every agent shares. Use at the start of any task to read the memory index and `recall` what is known, and whenever something is worth remembering across sessions.
---

# Agentic memory

`~/.agents` is one vault shared by every agent (Claude Code, Codex, Cursor, ...) and
by ADMIN in Obsidian. It is plain Markdown in one Git repository: no server, plugin or
MCP is needed, only file access and the `recall` command on PATH.
Git is the backup and the history.

```text
~/.agents/
  AGENTS.md                      # global rules (linked from the AGENTS.md repo)
  memory/                        # the one memory every agent shares
    MEMORY.md                    # index: one line per memory
    <memory-name>.md             # one memory per file
  projects/<project>/            # <project> = main checkout path relative to home, e.g. dev/GameBox
    TASKS.md  tasks/             # the project's Factory tasks, owned by the factory skill
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
  belongs in the task's documents), secrets, credentials or other people's personal data. When ADMIN asks to
  remember one of those, ask what was non-obvious about it and save that.
- A memory reflects what was true when written. Before relying on a file, flag or
  command it names, check that it still exists, and fix the memory when it is wrong.

## Recall

At the start of a task, run `recall <keywords>` with the words that name the work
(feature, area, tool, file). It prints the matching bullets and paragraphs of every
memory and of the current project's `TASKS.md` (the task index the
[factory skill](../factory/SKILL.md) generates), best first, each as
`<file>:<line> › <memory or headings>`; `--all` adds every project's `TASKS.md`. Run it
from the project's checkout or worktree, or anywhere under its `projects/` folder. Open
the files it names for the full context.

## Writing to the vault

- Links are relative Markdown links to the file, so they work in Obsidian,
  in `md <file.md>` and on any Git host.
- Commit only the paths you changed, so concurrent agents never sweep up each other's
  edits; retry when `index.lock` is held:
  `git -C ~/.agents add -- <paths> && git -C ~/.agents commit -q -m "<message>" -- <paths>`.
- Code is committed in the project's own repository and worktree, never in the vault.
