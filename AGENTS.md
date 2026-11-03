# AGENTS
Address the user as ADMIN. GLOBAL means `~/.agents/`.

## Directory structure
Never add a top-level directory without asking. Beyond the stack's own source layout, every project has:

- `.factory/<NNN>-<task-name>/` : Factory tasks, numbered `001`, `002`, ... in creation order so directories always sort, with `TASK.md` frontmatter metadata (including `status`: `backlog`, `inprogress`, `blocked`, `done`), approved `INTENT.md`, accepted `DESIGN.md` with its artifacts in the task's `design/` folder, mutable `PLAN.md`, `DEBRIEF.md`, and the test `REPORT.md` (raw evidence in the task's gitignored `evidence/` folder). `.factory/` lists every Factory task; there is no `docs/tasks/`. The directory name never changes; status lives in `TASK.md`. Subtasks are directories `<NNN>-<subtask-name>/`, numbered within the task's `subtasks/` folder, with the same files and need no ADMIN approval. Historical briefs and plans stay in place unless migration is requested.
- `docs/reports/`: benchmark, test and verification results not tied to a Factory task (a task's report and debrief live in its `.factory/` directory), one dir or `.md` per run, `$date-$title`. Track only Markdown summaries; raw output (json, png, logs, traces) is gitignored. Playwright and playthrough output is written here by the config.
- `docs/README.md`, `docs/architecture.md`, `docs/domain.md`, `docs/data-model.md`, `docs/quality.md`, and `docs/operations.md`: system purpose/navigation, structure, shared concepts, data ownership, quality requirements, and operational behavior. These documents live directly under `docs/`.
- `docs/areas/<area-name>.md`: ground rules, state ownership, and relevant contracts for each software area.
- `docs/workflows/<flow-name>.md`: actor goals, triggers, steps, outcomes, and failure/recovery behavior across areas. Actors include users, external systems, jobs, and operators.
- Keep specification facts in one owning document and link related documents. Contracts belong in areas; consequential decisions and their reasoning belong in task plans/debriefs, linked from the relevant specification. No mandatory `contracts/` or `decisions/` directories. Keep historical specs in place unless migration is requested.
- `tools/`: all scripts, build/install tooling, benchmark drivers, checks, generators and their fixtures. Nothing executable at the repo root or in `scripts/`.
- `.work/`: gitignored scratch space.
- `.worktrees/`: git worktrees not tied to a Factory task. A Factory task's worktrees live in its own `.factory/<NNN>-<task-name>/worktree/<branch-name>/` (gitignored); subtasks use their own `worktree/` the same way.

## Rules
### Version Control
**Keep worktrees of each project in it's own directory: `worktree/` inside the Factory task directory for task work, `.worktrees/` otherwise**
**Each new session should start from a clean git worktree from a branch (default to master/main)**
**Never checkout the main repository to other branch than main all work happens in worktrees**
**Each agent round should conclude with a commit.**
**Commit messages should reference the intent and plan document of requested change(in absence of said documents, commit message should just echo user's request)**
**Branch names should not have `codex` or `claude` as prefix, they should be prefixed by `feat-` or `fix-`.**

### Language and Stack
**TypeScript first.** All scripts, tools and app code are TypeScript. Add no other language without ADMIN's explicit approval for that change. Existing non-TypeScript code stays until ported or approved.
  - **Effect.ts** is a mandatory dependency in every TypeScript project, client and server.
  - **Oxlint + Oxfmt** are initialized and run via `npm run lint`. Install the [anti-slop](https://github.com/dmmulroy/anti-slop) rules and enable all of them; `configure-oxlint` points to the upstream installation skill.
  - **One config per test runner:** `playwright.config.ts` (`PW_SUITE=<name>`) and `vitest.config.ts` (`VITEST_SUITE=<name>`). Add a suite rather than a new config file.
  - When there is an obvious performance gain by using a more low-level language like Rust, prompt the user whether they want a rewrite or atleast notify them for they can think about it.


### Agentic
- Validation and qualification MUST be done for all session but regression checks come first. First make sure we didn't break anything then check for validity and quality. Costly (time or token) validations should come at the end, cheap validation using unit tests or similar work can be done while implementing but heavy validation gates should be done as the final step, subagents that are implementing a part of some larger task MUST not run heavy validations and running heavy costly validations are only allowed in the main agents that are managing subagents and is only allowed by managing agents when they want to validate a whole task and call it done, before it's DENIED.
- It's really important when pursuing a goal we should move towards implementing all the goal specifies first and then validation and qualification. We should spend hours validating a half baked implementation which proves nothing.

### Artifacts
**All artifacts are Markdown.** Specs, intents, designs, plans, debriefs, reports and any other document an agent produces are `.md` files (`INTENT.md`, `PLAN.md`, ...). Do not write HTML documents to communicate with ADMIN: ADMIN reviews any Markdown file rendered in Claude-style HTML with `md <file.md>` (`tools/md.ts`, linked onto PATH by the installer). Use Mermaid code blocks for diagrams. Projects may keep older HTML documents in place; every new document is Markdown.

### Cleanliness
- **No leftover files.** Add no Markdown or JSON that nothing will read again (progress notes, handoffs, summaries, audit dumps, receipts). Delete your own scratch files, `.work` contents and stray processes when the request is done.
- **No leftover worktrees** All agents should cleanup worktrees they create after they have committed all changes on the target branch.

## Compact Instructions
When the conversation is compacted, keep ADMIN's main goal: the request being worked, the approved intent, design and plan paths, decisions made and why, files changed, and the next action. Drop unrelated side questions ADMIN asked and their answers, and exploration that led nowhere.

## Documentation workflow

[Factory](skills/factory/SKILL.md) is an **opt-in** delivery pipeline:
Intent → Design → Plan → Build → Test. It runs only when ADMIN types `/factory`, optionally with a
stage subcommand (`/factory intent`, `/factory design`, `/factory plan`, `/factory build`,
`/factory test`); never start it from an inferred trigger. Without a command, handle
software requests directly under these rules. Factory reads affected specs before
intent and plan, and reconciles them with verified behavior in Test using its own
specification guide. Research discussions do not authorize implementation.

GLOBAL template filenames remain available through installer-managed symlinks;
intent, design, plan, debrief, test report, task and specification templates live
inside Factory.
