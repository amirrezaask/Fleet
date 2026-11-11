---
title: "Skill catalog"
---

## Area

Task-specific instructions under `skills/`, discovered through each directory's
`SKILL.md`. Agent hosts decide which descriptions match a request.

## Requirements

- **R1:** Given a skill, when its metadata is read, then its kebab-case name matches its directory and a short description identifies a task trigger.
- **R2:** Given an unrelated task, when an agent considers these skills, then no entrypoint instructs it to load all personal notes or treats the skills as always-on memory.
- **R3:** Given performance work, when selecting guidance, then one `performance` entrypoint covers systems, browser, and GPU performance and routes to the references needed by the symptom. The former performance entrypoints are absent.
- **R4:** Given the global catalog, when listing its skills, then `factory` (its stages are `/factory intent|design|plan|build|review` subcommands documented in its SKILL.md, not separate skills; amended 2026-11-03 by ADMIN's request to drop the factory-* mini skills), `performance`, `configure-oxlint`, and `resource-bounded-runs` appear. Webapp verification is retired; Koloop browser testing, promotion, and PS3 compilation skills live in GameBox's local library.
- **R5:** Given conditional reference material, when loading an entrypoint, then it links the relevant local references rather than requiring every reference to load.
- **R6:** Given `npm run check:skills`, when the catalog is valid, then name, description, entrypoint size, unscoped-loading wording, and local link checks in Markdown skill files pass. This structural check does not establish the host model's routing behavior.
- **R7:** Given AGENTS.md, when reading its documentation workflow, then Factory is an opt-in pipeline started only by `/factory`, optionally with a stage subcommand. Factory owns intents, designs, plans, debriefs, reviews, tasks and the specification templates, and carries its own specification-maintenance guide (amended 2026-11-03 by ADMIN's request to keep every document Markdown and review it with `md`). The retired communication, specification, atlas, hbs and factory-<stage> entrypoints remain absent.
- **R8:** Given `configure-oxlint`, when reading the skill, then a single entrypoint describes base lint policy and the upstream `install-anti-slop` installation command. Its directory contains no vendored rules, helper installer, or supporting reference files.
- **R9:** Given the global catalog, when listing its skills, then `change-review`, `debugging` and `maintenance` also appear (added 2026-11-12 by ADMIN's request to review the skills and add or remove as needed). `change-review` owns the code, security, UI and UX lenses and the reviewer reply format; Factory's Review stage links to it instead of restating them, and the installer treats it as required with Factory. `maintenance` follows AGENTS.md: the coordinator commits each reviewed round, and area agents run no build, browser or end-to-end suite.
- **R10:** Given a skill in this catalog, when judging whether it belongs, then it is a procedure for one kind of task. Rules for every task live in AGENTS.md, project-specific procedures in that project's own skill folder, and library or framework knowledge is installed from its upstream rather than copied here.
