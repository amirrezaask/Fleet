# AGENTS
Address the user as ADMIN. GLOBAL means `~/.agents/`.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.
## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Agent memory vault
`~/.agents` is an Obsidian vault and a Git repository shared by every agent: `memory/` holds one fact per note indexed by `memory/MEMORY.md`, and `projects/<project>/` holds each project's notes and tasks. Read `memory/MEMORY.md` at the start of a task, write memories and task documents there, and commit only the paths you changed. The `agentic-memory` skill (`~/.agents/skills/agentic-memory/`) holds the conventions and the document templates.

## Directory structure
Never add a top-level directory without asking. Beyond the stack's own source layout, every project has:

- `~/.agents/projects/<project>/tasks/<NNN>-<task-name>/` : tasks, kept in the agent memory vault outside the repository so every worktree and agent sees one live copy (`<project>` is the main checkout's path relative to home, e.g. `dev/GameBox`), numbered `001`, `002`, ... in creation order. `TASK.md` holds the frontmatter (`status`: `backlog`, `inprogress`, `blocked`, `done`) and the current state; the task has only the documents its size needs: `INTENT.md` (approved by ADMIN before code), `DESIGN.md` with its `design/` folder, `PLAN.md`, `DEBRIEF.md` and `REVIEW.md` (raw evidence in the task's gitignored `evidence/` folder). There is no pipeline, stage or board. The directory name never changes; subtasks are `<NNN>-<subtask-name>/` in the task's `subtasks/` folder and need no ADMIN approval. A project has no `.factory/` or `docs/tasks/`.
- `docs/reports/`: benchmark, test and verification results not tied to a task (a task's report and debrief live in its task directory), one dir or `.md` per run, `$date-$title`. Track only Markdown summaries; raw output (json, png, logs, traces) is gitignored. Playwright and playthrough output is written here by the config.
- `docs/README.md`, `docs/architecture.md`, `docs/domain.md`, `docs/data-model.md`, `docs/quality.md`, and `docs/operations.md`: system purpose/navigation, structure, shared concepts, data ownership, quality requirements, and operational behavior. These documents live directly under `docs/`.
- `docs/areas/<area-name>.md`: ground rules, state ownership, and relevant contracts for each software area.
- `docs/workflows/<flow-name>.md`: actor goals, triggers, steps, outcomes, and failure/recovery behavior across areas. Actors include users, external systems, jobs, and operators.
- Keep specification facts in one owning document and link related documents. Contracts belong in areas; consequential decisions and their reasoning belong in task plans/debriefs, linked from the relevant specification. No mandatory `contracts/` or `decisions/` directories. Keep historical specs in place unless migration is requested.
- `tools/`: all scripts, build/install tooling, benchmark drivers, checks, generators and their fixtures. Nothing executable at the repo root or in `scripts/`.
- `.work/`: gitignored scratch space.
- `.worktrees/`: every git worktree of the project, task or not, at `.worktrees/<branch-name>/`.

## Rules
### Version Control
**Keep worktrees of each project in it's own `.worktrees/` directory**
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
