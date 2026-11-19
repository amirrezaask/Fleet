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
- **R2:** Given a memory, when it is written, then it is one fact per `memory/<slug>.md` with `name`, `description`, `type` (`user`, `feedback`, `project`, `reference`), optional `project` and `updated` frontmatter, and one index line in `memory/MEMORY.md`. Agents update or delete an existing note before adding a duplicate, and never store secrets or other people's personal data.
- **R3:** Given a task, when its documents are written, then they live in `~/.agents/projects/<project>/tasks/<NNN>-<task-name>/`, where `<project>` is the main checkout's path relative to home and `<NNN>` is claimed with a non-recursive `mkdir`. `TASK.md` frontmatter holds `title`, `created`, `updated`, `status` (`backlog`, `inprogress`, `blocked`, `done`) and `branch`; there is no stage, gate or board. Subtasks live in `subtasks/<NNN>-<name>/` and need no ADMIN approval.
- **R4:** Given a task, when choosing documents, then only those its size needs are written from the skill's templates: `INTENT.md` (approved by ADMIN before code), `DESIGN.md` with `design/`, `PLAN.md`, `DEBRIEF.md` and `REVIEW.md`; raw output goes in a gitignored `evidence/` folder. The intent, design, plan, debrief, review, task, area and workflow templates each have one canonical file in `skills/agentic-memory/templates/`.
- **R5:** Given concurrent agents, when committing to the vault, then each commits only the paths it changed. Code is committed in the project's own repository, never in the vault.
- **R6:** Given installation, when the vault seed in `skills/agentic-memory/assets/vault/` is copied into `~/.agents`, then existing files are never replaced. The vault's `.gitignore` tracks only `memory/`, `projects/` and `.obsidian/app.json`, so installed skills, tools and links stay out of the vault's history.
