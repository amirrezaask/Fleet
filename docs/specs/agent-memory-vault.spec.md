---
title: "Agent memory vault"
---

## Area

`skills/agentic-memory/` owns the conventions of `~/.agents` as the agent memory
vault: memories, `recall` and how to write to the vault. It replaced the Factory
pipeline on 2026-11-19; on 2026-11-21 ADMIN's request to restore the factory skill and
remove every task file and template from this one moved tasks, their documents and the
templates back to Factory ([Factory workflow](documentation-workflow.spec.md)).

## Requirements

- **R1:** Given any agent with file access, when it uses the vault, then `~/.agents` is plain Markdown in one Git repository that is also an Obsidian vault; no server, plugin or MCP is required.
- **R2:** Given memory, when it is written, then it goes to `~/.agents/memory/`, one fact per file in Claude Code's auto-memory format (frontmatter `name`, `description`, `metadata.type`: `user`, `feedback`, `project` or `reference`), with one index line per memory in `memory/MEMORY.md`, under a `## <project>` heading when it belongs to one project. Every agent reads the index at the start of a session; Claude Code loads it through `autoMemoryDirectory`, and each `~/.claude/projects/*/memory` folder is a link to it. Memories are updated in place rather than duplicated, and hold no task state, secrets or other people's personal data (amended 2026-11-19 by ADMIN's request to adopt Claude's memory as the agent-agnostic memory and merge every memory into one).
- **R2a:** Given `recall <keyword...>`, when it runs, then it prints the bullets and paragraphs of every file in `~/.agents/memory/` and the current project's `TASKS.md` that contain any keyword (case-insensitive), ranked by distinct keywords then occurrences, each with its file, line and heading path (a memory's name and description head its chunks; its frontmatter is not a chunk), at most 20; `--all` adds every project's `TASKS.md`. The project is the checkout's main path relative to home, or the `projects/` folder holding the current directory (amended 2026-11-19 by ADMIN's request for structured memory and `recall`).
- **R2b:** Given `tasks-index [project]`, when it runs, then it rewrites `projects/<project>/TASKS.md` with one line per task and indented subtask lines: name linked to the task directory, the stage read from its documents (`new`, `intent`, `design`, `plan`, `build`, or `done` when `REVIEW.md` records `**Review verdict:** PASS` or a subtask's `PLAN.md` records `**Merged:**`), the title from the first heading of `INTENT.md` (the directory name without one), and links to its Markdown documents. `TASK.md` is not read. Agents never edit `TASKS.md` by hand (amended 2026-11-21 by ADMIN's request to restore Factory without `TASK.md`).
- **R3:** Given the skill directory, when listing it, then it holds `SKILL.md` and the vault seed only: no task section, task document or template (amended 2026-11-21 by ADMIN's request to remove them; tasks are specified in [Factory workflow](documentation-workflow.spec.md) R4 and R5).
- **R5:** Given concurrent agents, when committing to the vault, then each commits only the paths it changed. Code is committed in the project's own repository, never in the vault.
- **R6:** Given installation, when the vault seed in `skills/agentic-memory/assets/vault/` is copied into `~/.agents`, then existing files are never replaced. The vault's `.gitignore` tracks only `memory/`, `projects/` and `.obsidian/app.json`, so installed skills, tools and links stay out of the vault's history. Installation sets Claude Code's `autoMemoryDirectory` to `~/.agents/memory` when unset and replaces each empty `~/.claude/projects/*/memory` folder with a link to it; a folder that still holds memories is kept and reported.
