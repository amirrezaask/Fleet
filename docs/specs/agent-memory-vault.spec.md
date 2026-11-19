---
title: "Agent memory vault"
---

## Area

`skills/agentic-memory/` owns the conventions of `~/.agents` as the agent memory
vault: memories, project tasks and the task document templates. It replaced the
Factory pipeline on 2026-11-19 by ADMIN's request to keep Factory's documents and drop
its state machine and board; the Factory requirements are in Git history.

## Requirements

- **R1:** Given any agent with file access, when it uses the vault, then `~/.agents` is plain Markdown in one Git repository that is also an Obsidian vault; no server, plugin or MCP is required.
- **R2:** Given memory, when it is written, then it goes to `~/.agents/memory/`, one fact per file in Claude Code's auto-memory format (frontmatter `name`, `description`, `metadata.type`: `user`, `feedback`, `project` or `reference`), with one index line per memory in `memory/MEMORY.md`, under a `## <project>` heading when it belongs to one project. Every agent reads the index at the start of a session; Claude Code loads it through `autoMemoryDirectory`, and each `~/.claude/projects/*/memory` folder is a link to it. Memories are updated in place rather than duplicated, and hold no task state, secrets or other people's personal data (amended 2026-11-19 by ADMIN's request to adopt Claude's memory as the agent-agnostic memory and merge every memory into one).
- **R2a:** Given `recall <keyword...>`, when it runs, then it prints the bullets and paragraphs of every file in `~/.agents/memory/` and the current project's `TASKS.md` that contain any keyword (case-insensitive), ranked by distinct keywords then occurrences, each with its file, line and heading path (a memory's name and description head its chunks; its frontmatter is not a chunk), at most 20; `--all` adds every project's `TASKS.md`. The project is the checkout's main path relative to home, or the `projects/` folder holding the current directory (amended 2026-11-19 by ADMIN's request for structured memory and `recall`).
- **R2b:** Given `tasks-index [project]`, when it runs, then it rewrites `projects/<project>/TASKS.md` with one line per task and indented subtask lines: name linked to `TASK.md`, `status` and `title` from its frontmatter, and links to its other Markdown documents. Agents never edit `TASKS.md` by hand (amended 2026-11-19 by ADMIN's request for structured memory and `recall`).
- **R3:** Given a task, when its documents are written, then they live in `~/.agents/projects/<project>/tasks/<NNN>-<task-name>/`, where `<project>` is the main checkout's path relative to home and `<NNN>` is claimed with a non-recursive `mkdir`. `TASK.md` frontmatter holds `title`, `created`, `updated`, `status` (`backlog`, `inprogress`, `blocked`, `done`) and `branch`; there is no stage, gate or board. Subtasks live in `subtasks/<NNN>-<name>/` and need no ADMIN approval.
- **R4:** Given a task, when choosing documents, then only those its size needs are written from the skill's templates: `INTENT.md` (approved by ADMIN before code), `DESIGN.md` with `design/`, `PLAN.md`, `DEBRIEF.md` and `REVIEW.md`; raw output goes in a gitignored `evidence/` folder. The intent, design, plan, debrief, review, task, area and workflow templates each have one canonical file in `skills/agentic-memory/templates/`.
- **R5:** Given concurrent agents, when committing to the vault, then each commits only the paths it changed. Code is committed in the project's own repository, never in the vault.
- **R6:** Given installation, when the vault seed in `skills/agentic-memory/assets/vault/` is copied into `~/.agents`, then existing files are never replaced. The vault's `.gitignore` tracks only `memory/`, `projects/` and `.obsidian/app.json`, so installed skills, tools and links stay out of the vault's history. Installation sets Claude Code's `autoMemoryDirectory` to `~/.agents/memory` when unset and replaces each empty `~/.claude/projects/*/memory` folder with a link to it; a folder that still holds memories is kept and reported.
