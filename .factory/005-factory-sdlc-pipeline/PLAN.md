# Factory pipeline implementation plan

Plan · for [INTENT.md](INTENT.md) and [DESIGN.md](DESIGN.md) · created 2026-11-02 16:50 · Claude Code claude-opus-5-5

## Objective

Implement INTENT:R1–R5 using DESIGN:D1–D9. Preserved specs: `docs/specs/factory-board.spec.md` (safety rules R4, R6, R7) and `docs/specs/agent-installation.spec.md`.

## Current state

- `skills/factory/SKILL.md` defines Clarify → Plan → Build and verify → Learn, and auto-triggers on software work.
- Templates: TASK, BRIEF, PLAN, DEBRIEF. The installer links global aliases for BRIEF, PLAN and DEBRIEF.
- The board server renders BRIEF and PLAN for each task. The UI has Brief and Plan tabs.
- `tools/validate-skills.ts` checks frontmatter, the 150-line entrypoint limit and local links. The installer links every `skills/*` directory.

## Files that change

| Path | Change | Why |
| --- | --- | --- |
| `skills/factory/SKILL.md`, `references/*` | Rewrite the entrypoint. Add design, build and test guides, rename clarify.md to intent.md, update plan, tasks, subtasks and specifications. | M2, D1–D8 |
| `skills/factory-{intent,design,plan,build,test}/`, `skills/factory/agents/openai.yaml` | Add | M3, D1, D2 |
| `skills/factory/templates/*` | Rename BRIEF to INTENT. Add DESIGN and TEST_REPORT. Rewrite PLAN and DEBRIEF. Add stage to TASK. | M4, R4 |
| `skills/factory/assets/task-board/{server.ts,index.html}`, `tools/*.test.ts`, `tools/install.ts` | Edit | M5, D7, D9 |
| `AGENTS.md`, `README.md`, `docs/specs/*.spec.md`, `skills/atlas/*`, `skills/hbs/SKILL.md` | Edit wording | M6 |

## Work

| ID | Action | Depends on | Done when |
| --- | --- | --- | --- |
| M1 | Extract the article into `design/playbook-knowledge.md` | None | The page covers every stage and the comparison (T5) |
| M2 | Write the Factory entrypoint and the stage guides | M1 | T1 passes |
| M3 | Add the stage command skills and the opt-in metadata | M2 | T1, T4 pass |
| M4 | Write the templates | M2 | T6 |
| M5 | Update the board and installer, done by a subagent on disjoint files | M4 (file names) | T2, T3 pass |
| M6 | Amend the specs and update AGENTS.md and README | M2 | T7 |

## Test plan

| ID | Proves | Level | Tier | File or procedure | Command | Pass condition |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | R2, R3 | unit | fast | `tools/validate-skills.ts` | `npm run check:skills` | All skills valid, entrypoint ≤150 lines, links resolve |
| T2 | R5 | integration | fast | `tools/factory-board.test.ts`, `tools/install.test.ts` | `npm test` | All pass, including the INTENT/BRIEF fallback, stage and retired-alias tests |
| T3 | R5 | static | fast | types | `npm run check:types` | Exit 0 |
| T4 | R3 | manual | fast | Every `skills/factory*/SKILL.md` has `disable-model-invocation: true` and an openai.yaml | `rg -L "disable-model-invocation: true" skills/factory*/SKILL.md` | No output |
| T5 | R1 | manual | heavy | Open the knowledge page rendered, in light and dark | `md` | Renders, no console errors |
| T6 | R4 | manual | heavy | Render each template | `md` | Readable |
| T7 | R2, R3 | manual | fast | No stale "brief" workflow wording | `rg -i brief` on docs and skills | Only legacy-compatibility mentions remain |
| T8 | R5 | static | fast | lint | `npm run lint` | No new failures compared with master |

## Risks

| ID | Risk | Mitigation | Caught by |
| --- | --- | --- | --- |
| K1 | Installed `~/.claude/BRIEF_TEMPLATE.html` alias dangles | Retire it in the installer | T2 |
| K2 | Stage skills link to `../factory`, which breaks if Factory isn't installed | `requiredSkills` always installs Factory | T2 |
| K3 | The user's uncommitted master edits to AGENTS.md and SKILL.md conflict with this branch | Carry them into this branch | Merge |

## Interrogation

- **What could this break?** Agents that relied on Factory loading automatically now won't use it. That is intended (R3).
- **Riskiest step:** M5, the board API rename, because the UI and server must change together.
- **Rejected options:** see DESIGN D1–D9.
- **Not verifiable locally:** whether Codex honors `openai.yaml` for the new skills, which follows the Atlas precedent.

## Handoff

- **Starting point:** branch `feat-factory-sdlc-pipeline` from master c89b5b0, in worktree `.worktrees/feat-factory-sdlc-pipeline`.
- **First action:** M1.

## Revisions

- 2026-11-02: the plan was written while M1–M6 were in progress, during the session that created the pipeline, not before it. That process exception is recorded in DEBRIEF.
- 2026-11-02 (amendment): M7 makes Factory self-contained (its own `references/specifications.md` plus copied area and workflow templates, no Atlas links), keeps design artifacts in the task's own `design/` folder alongside its subtasks, flattens tasks to `docs/tasks/<name>-<status>/` with child subtask directories (board and session hook read both layouts and migrate legacy tasks on move), and replaces "ADMIN" with "the user" across Factory. Existing tasks in this repo were migrated to the flat layout. Checks: T1–T3 and T7 re-run.
- 2026-11-02 (amendment): the user moved every Factory task from `docs/tasks/` to `.factory/` and asked that debriefs live with their task. Each `docs/reports/` debrief moved into its task directory (tasks handled without Factory got a `TASK.md`); this task's test report became `REPORT.md`, raw evidence goes in a gitignored `evidence/` folder, and the board and session hook read `.factory/`, falling back to `docs/tasks/` while a project has not migrated. Checks: T1–T3 and T7 re-run.
