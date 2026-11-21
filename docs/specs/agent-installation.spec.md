---
title: "Agent installation"
---

## Area

`tools/install.ts` installs this repository's global instructions and individually
discoverable skills using symlinks, and seeds the agent memory vault.

## Requirements

- **R1:** Given Node.js 24 or newer, when `npm run install:agents` runs, then root `AGENTS.md` links into `~/.agents`, `~/.codex`, and `~/.claude`, and the files in `skills/agentic-memory/assets/vault/` are copied into `~/.agents` where absent; templates are read from the factory skill, with no global aliases (amended 2026-11-19 by ADMIN's request to replace Factory with the agent memory vault). Each skill links separately into the agents' skill directories and `~/.cursor/skills-cursor`.
- **R2:** Given `--list` or `--dry-run`, when the installer runs, then it reports discovered skills or intended changes without writing to the home directory.
- **R3:** Given explicit skill names, when installation runs, then it installs those skills, the global files, and the mandatory `agentic-memory`, `factory` and `change-review` skills (amended 2026-11-21 by ADMIN's request to restore the factory skill). Unknown names or options fail before mutation.
- **R4:** Given an existing regular file, directory, unrelated symlink, or symlinked destination parent, when it conflicts with installation, then preflight rejects the install before changing links. Unrelated installed skills remain intact.
- **R5:** Given individual skill links into `~/dev/Amirreza.md/skills`, when installation runs, then matching skills migrate here. A full install removes links owned by the old source or this repo for skills absent from the current catalog, and removes this repo's obsolete root `install.sh` links. Selected installs preserve other retired skill links but remove managed communication, specification, atlas, hbs and factory-<stage> links (amended 2026-11-21: `factory` is a catalog skill again). Every install removes global `*_TEMPLATE.md` and `*_TEMPLATE.html` aliases that point at locations this repo managed; foreign links stay (amended 2026-11-19 by ADMIN's request to replace Factory with the agent memory vault).
- **R6a:** Given a full or selected install, when it runs, then `tools/md.ts` links as `~/.local/bin/md` `tools/obsidian.ts` as `~/.local/bin/obsidian` (added 2026-11-19 by ADMIN's request for `obsidian .`), and `tools/recall.ts` and `tools/tasks-index.ts` as `~/.local/bin/recall` and `~/.local/bin/tasks-index` (amended 2026-11-19 by ADMIN's request for structured memory and `recall`), and a `~/.local/bin/production-line` link to the retired Factory board is removed (amended 2026-11-19 by ADMIN's request to replace Factory with the agent memory vault).
- **R6:** Given an installed repository, when installation repeats, then correct links remain unchanged. The installer never replaces the entire skill directory or links tooling and Git metadata into agent configuration.
- **R7:** Given template symlinks pointing to this repository's former root-template, Factory, Atlas or communication/specification template paths, when installation runs, then it removes them even if the old links dangle (amended 2026-11-19 by ADMIN's request to replace Factory with the agent memory vault). Foreign links and real files are left in place.
- **R8:** Given a missing bundled file (`AGENTS.md`, `tools/md.ts`) or mandatory skill entrypoint, when installation runs, then it fails before changing destination files or links.
