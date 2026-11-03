# Global agent instructions and skills

`AGENTS.md` holds global conventions. Factory is an opt-in delivery pipeline,
Intent → Design → Plan → Build → Review, started only by `/factory` or a stage
command. Every document agents write is Markdown; ADMIN reviews any of them rendered
as Claude-styled HTML with `md <file.md>`.

## Skills

| Skill | Task trigger |
| --- | --- |
| `factory` | Only `/factory`: route a task through the pipeline, stopping at human gates; task board |
| `configure-oxlint` | Base Oxlint/Oxfmt policy and upstream anti-slop skill installation |
| `performance` | Systems, browser, and GPU performance investigations and optimization |
| `resource-bounded-runs` | Large copies and resource-heavy build or test processes |

## Factory pipeline

Adapted from the [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook):
every stage commits one artifact that the next stage reads, and the user's attention
goes to the gates.

| Stage | Command | Artifact | Reader | Gate |
| --- | --- | --- | --- | --- |
| Intent | `/factory intent` | `INTENT.md` | The user, one screen | The user approves |
| Design | `/factory design` | `DESIGN.md` + `design/` mocks and diagrams | The user reviews | The user accepts (or skip recorded) |
| Plan | `/factory plan` | `PLAN.md` with a fast/heavy test plan | Agents, verbose | Self-check, committed before code |
| Build | `/factory build` | Code, tests, `DEBRIEF.md`, `REPORT.md` | Future agents; the user reads the verdict | Fast tests green, regression, acceptance, then heavy gates last |
| Review | `/factory review` | Review section of `REPORT.md` | The user, verdict first | Four parallel reviewers (code, security, UI, UX) pass |

Skills use `disable-model-invocation: true` (Claude Code) and
`agents/openai.yaml` `allow_implicit_invocation: false` (Codex), so hosts never load
them implicitly. Stage commands are thin entrypoints; the [Factory skill](skills/factory/SKILL.md)
holds the shared contract and `skills/factory/references/<stage>.md` holds each stage's
method. Tasks live in `.factory/<task>/` with their status in `TASK.md`; the optional board shows the
stage and the Intent/Design/Plan/Debrief documents.

## Markdown documents and `md`

Specs, intents, designs, plans, debriefs and reports are Markdown (see `AGENTS.md`),
so agents read and edit them cheaply and Git diffs stay readable. To review one:

```sh
md .factory/<task>/PLAN.md
md docs/areas/identity.md --out /tmp/review --no-open
```

`tools/md.ts` renders the file with the Claude tokens and bundled Anthropic fonts in
light and dark mode, shows frontmatter as chips, renders Mermaid code blocks, and also
renders the local Markdown files it links to so links work in the browser. Pages are
written to the system temp directory (`md-preview/`) and opened with the default
browser. The installer links it onto PATH as `~/.local/bin/md`.

## Factory tasks

Run `/factory <request>` (or one stage command at a time). The task then lives in:

```text
.factory/<NNN>-<task-name>/         # 001, 002, ... in creation order; name never changes
  TASK.md           # frontmatter: title, dates, status (backlog | inprogress | blocked | done), stage; blocker, report link
  INTENT.md         # approved requirements (one screen, for the user)
  DESIGN.md         # flagged concerns, decisions, links into design/
  design/           # design artifacts: Mermaid pages, mocks, prototypes, images
  PLAN.md           # agent-facing plan, test plan, recorded revisions
  DEBRIEF.md        # build notes for future agents and engineers
  REPORT.md         # verification report, verdict first; Review appends its findings
  evidence/         # raw test output (gitignored)
  subtasks/<NNN>-<subtask-name>/   # same files; no approval from the user needed
```

New task documents are Markdown, built from Factory's `TASK_TEMPLATE.md`,
`INTENT_TEMPLATE.md`, `DESIGN_TEMPLATE.md`, `PLAN_TEMPLATE.md`,
`DEBRIEF_TEMPLATE.md` and `TEST_REPORT_TEMPLATE.md` (the test report is the
task's `REPORT.md`). Older `BRIEF.*` and HTML task documents stay readable; when both
formats exist the Markdown file wins, and the board shows a legacy brief as the intent.

A task's status is the `status:` frontmatter key in its `TASK.md`; change it by editing the key
or with the board, never by renaming the directory. Tasks in older layouts (`<task>-<status>/`,
`<status>/<task>/`, `docs/tasks/`) must be migrated before the board or hook reads them
([task layout](skills/factory/references/tasks.md)). Subtasks are full tasks nested in their parent's `subtasks/` folder, and they nest recursively: a
subtask can have subtasks, to any depth. Their intents refine the parent
intent and need no approval from the user, and the parent finishes only when all of its
subtasks, at every depth, are done.

Agents may revise the plan while preserving the intent, accepted design and
existing area-spec requirements. Requirement changes need the user's explicit
authorization. Build runs fast tests continuously, then regression, acceptance and heavy gates last; Review runs four
independent reviewers (code, security, UI, UX). Reports live in their task directory; system specifications live directly under `docs/`, with area
rules/contracts in `docs/areas/` and actor flows in `docs/workflows/`. Existing
`docs/specs/` files remain in place until an authorized migration.

The optional board groups cards into Backlog, In progress, Blocked, and Done (one per status directory) and shows subtask progress on parent cards.
The single-file React app in `index.html` uses adapted shadcn components and
Tailwind. Cards show the task's stage and open a modal with rendered Intent, Design, Plan and Debrief tabs. Drag-and-drop or keyboard moves move the task directory and update
`TASK.md` (or a legacy `TASK.html`); they never launch sessions or prove that work is complete.
One board watches all your projects: run `npx amirreza-factory [project-dir...]`
(see the [board instructions](skills/factory/references/tasks.md)); add or remove projects from
the header or by passing directories. Projects are remembered in `~/.factory/projects.json`. The
server prepares local React/Tailwind assets at startup; no separate build command or database is needed.
Card moves, modal opening, and tab changes update React state without navigation.
Historical briefs, plans and debriefs are not automatically moved.

Run it from this repository with `npm run factory:board`; `PORT=4311` picks a port.

## Install

Requires Node.js 24 or newer.

```sh
npm ci
npm run install:agents -- --dry-run
npm run install:agents
```

The installer links `AGENTS.md` and global template aliases into `~/.agents`,
`~/.codex`, and `~/.claude`. Each skill links separately into those hosts' skills
folders and Cursor's `~/.cursor/skills-cursor/`. It never replaces the whole
skills directory. Edits propagate through symlinks; rerun after catalog changes.

It also installs the Claude session hook: `tools/session-budget-hook.ts` links to
`~/.claude/hooks/` and `SessionStart`, `PreToolUse` and `Stop` entries are added to
`~/.claude/settings.json` (other settings and hooks are left untouched; unparseable
settings abort the install). The hook keeps autonomous sessions from asking ADMIN
questions or forking sessions. Context size is left to Claude Code: the installer sets
`autoCompactWindow` to 300000 when it is unset, so sessions compact themselves at about
300K tokens, guided by the Compact Instructions section of `AGENTS.md`. The entries
store the absolute path of the `node` that ran the installer, so rerun the installer
after upgrading Node.

```sh
npm run install:agents -- --list
npm run install:agents -- performance
```

Selected installs include Factory and the global files. The global
`INTENT_TEMPLATE.md`, `DESIGN_TEMPLATE.md`, `PLAN_TEMPLATE.md`, `DEBRIEF_TEMPLATE.md`,
`TEST_REPORT_TEMPLATE.md` and `SPEC_TEMPLATE.md` aliases point into
`skills/factory/templates/` (SPEC_TEMPLATE.md is `AREA_TEMPLATE.md`); TASK_TEMPLATE.md
and WORKFLOW_TEMPLATE.md are bundled with Factory. Installing through `npx skills`
includes bundled resources. Global aliases, `md` and AGENTS.md require this installer.

Managed former root, Factory spec, Atlas and communication/specification template links,
and the retired `*_TEMPLATE.html` aliases, migrate or are removed even when dangling.
Managed communication, specification, atlas and hbs skill links are removed on
full and selected installs. Other retired skill links are cleaned only on a full
install. Known skill links from `~/dev/Amirreza.md` also migrate. Unrelated files,
directories, and symlinks are preserved; collisions fail preflight before changes.

## Maintain

`configure-oxlint` contains instructions only. Use
`npx skills add dmmulroy/anti-slop --skill install-anti-slop` for setup in other
projects. This repository's lint command uses the pinned upstream archive from
the lockfile, enabling generic and Effect rules.

Keep one skill per directory with matching metadata. Essential instructions stay
in `SKILL.md`; conditional details belong in linked references. Templates have
one canonical location. The board's server is a reusable asset, with its test
runtime dependencies in this repository's devDependencies.

```sh
npm test
npm run lint
npm run check:types
npm run check:skills
```

Tests use isolated temporary data and remove it afterward. Catalog validation
checks metadata, entrypoint size, scope wording, and local links; it does not
prove model routing or semantic adherence to the workflow.
