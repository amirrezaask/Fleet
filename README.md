# Global agent instructions and skills

`AGENTS.md` holds global conventions. Factory is the single software development
workflow, from clarification and approved briefs to plans, implementation,
verification and debriefs. Atlas owns software specification discovery, structure
and templates; Factory uses its maintenance guidance during delivery.

## Skills

| Skill | Task trigger |
| --- | --- |
| `factory` | Features, bug fixes, software development, Factory tasks and local task board |
| `atlas` | Explicit `/atlas` initialization and documentation of an existing project |
| `hbs` | Any HTML document an agent makes to communicate with ADMIN: explainers, comparisons, reviews, reports, charts, questionnaires, editors |
| `configure-oxlint` | Base Oxlint/Oxfmt policy and upstream anti-slop skill installation |
| `performance` | Systems, browser, and GPU performance investigations and optimization |
| `resource-bounded-runs` | Large copies and resource-heavy build or test processes |

Factory replaces the former `communication` workflow. Its
[entrypoint](skills/factory/SKILL.md) links clarification, planning, delivery
templates and the optional task board. [Atlas](skills/atlas/SKILL.md) replaces
the former specification conventions with evidence-based system discovery.

## HTML communication (HBS)

All agent artifacts are self-contained HTML (see `AGENTS.md`). [HBS](skills/hbs/SKILL.md)
picks the document format for the job and the visualization for each piece of data
or knowledge, then applies the shared Claude-style tokens in light and dark mode. Its
ideas come from [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/)
and its "Know your unknowns" pages.

| File | Contents |
| --- | --- |
| `skills/hbs/SKILL.md` | Workflow (job → visual by intent → answer first → reply loop), design and interaction rules |
| `skills/hbs/references/formats.md` | Format catalog: explore/decide, surface unknowns, during/after implementation, review, design, report, editors |
| `skills/hbs/references/dataviz.md` | Intent → visual tables for data and knowledge, then CSS/SVG recipes for numbers, bars, time, flows and review visuals |
| `skills/hbs/references/interactions.md` | State → render → export, copy with fallback, reply assembly, tabs, linking, live controls, drag, interview, quiz, deck |
| `skills/hbs/references/writing.md` | First screen, ordering by what ADMIN acts on, evidence, trade-offs, honesty devices, unknowns |
| `skills/hbs/templates/BASE_TEMPLATE.html` | Starting shell: tokens, prompt box, stat band, timeline, cards, diff, toggle, SVG classes, live reply and copy helper |

Factory's HTML templates keep their own structure and reuse the same tokens.

## Atlas specifications

Initialize documentation for an existing project with:

```text
/atlas
/atlas /path/to/project
/atlas the ordering subsystem in this repository
```

`/atlas [project path or scope]` is the only command that starts this baseline
workflow. Ordinary coding, explanation and documentation requests do not start
initialization. Atlas disables implicit skill invocation. Hosts that select
skills through `$atlas` or `/skills` should select the skill and include the
literal `/atlas` command in the request; this repository documents an agent
command convention, not a new host command parser.

Atlas inventories actors, entry points, state writers and integrations; maps
responsibilities; traces actor flows; and checks rules against alternate paths
and contrary evidence before writing. Its guides cover bounded investigation of
large repositories, source/runtime evidence, coverage gaps and accepted intent.
Contracts stay with areas; decision reasoning stays in linked task plans/debriefs.

```text
docs/
  README.md
  architecture.md
  domain.md
  data-model.md
  quality.md
  operations.md
  areas/<area-name>.md
  workflows/<flow-name>.md
  tasks/<task-name>/
  reports/
```

A full baseline creates the six root documents and the applicable areas and
workflows. Scoped maintenance updates affected documents only. Atlas preserves
historical documents unless migration is requested; it does not create empty
Factory tasks or require contracts/decisions directories. Factory reads affected
specifications before planning and reconciles them after verification without
implicitly starting a full baseline.

## Factory tasks

Discuss a feature or bug with the agent, approve its brief, and let it produce
an implementation plan. The task then lives in:

```text
docs/tasks/<status>/<task-name>/      # status: backlog | inprogress | blocked | done
  TASK.html     # title, dates, blocker, debrief link
  BRIEF.html    # approved requirements
  PLAN.html     # implementation approach and recorded revisions
  subtasks/<status>/<subtask-name>/   # same files; no ADMIN approval needed
```

New task documents are HTML, built from Factory's `TASK_TEMPLATE.html`,
`BRIEF_TEMPLATE.html`, `PLAN_TEMPLATE.html` and `DEBRIEF_TEMPLATE.html`
(debriefs land in `docs/reports/YYYY-MM-DD-<task-name>.html`). Older `TASK.md`,
`BRIEF.md` and `PLAN.md` files stay readable; the board renders both.

A task's status is the directory it sits in; move it with `git mv` or the board.
Subtasks are full tasks nested in their parent, and they nest recursively: a
subtask can have subtasks, to any depth. Their briefs refine the parent
brief and need no ADMIN approval, and the parent finishes only when all of its
subtasks, at every depth, are done.

Agents may revise the plan while preserving the brief and existing area-spec
requirements. Requirement changes need ADMIN's explicit authorization. Final
verification runs regression, acceptance, then quality checks. Debriefs live in
`docs/reports/`; system specifications live directly under `docs/`, with area
rules/contracts in `docs/areas/` and actor flows in `docs/workflows/`. Existing
`docs/specs/` files remain in place until an authorized migration.

The optional board groups cards into Backlog, In progress, Blocked, and Done (one per status directory) and shows subtask progress on parent cards.
The single-file React app in `index.html` uses adapted shadcn components and
Tailwind. Cards open a modal with rendered Brief and Plan tabs. Drag-and-drop or keyboard moves move the task directory and update
`TASK.html` (or a legacy `TASK.md`); they never launch sessions or prove that work is complete.
One board watches all your projects: run `npx amirreza-factory [project-dir...]`
(see the [board instructions](skills/factory/references/tasks.md)); add or remove projects from
the header or by passing directories. Projects are remembered in `~/.factory/projects.json`. The
server prepares local React/Tailwind assets at startup; no separate build command or database is needed.
Card moves, modal opening, and tab changes update React state without navigation.
Historical briefs and plans are not automatically moved.

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

Selected installs include Factory, Atlas and the global files. The global
`BRIEF_TEMPLATE.html`, `PLAN_TEMPLATE.html`, `DEBRIEF_TEMPLATE.html`, and
`SPEC_TEMPLATE.md` aliases remain available. Brief/plan/debrief aliases point into
`skills/factory/templates/`; SPEC_TEMPLATE.md points to
`skills/atlas/templates/AREA_TEMPLATE.md`. TASK_TEMPLATE.html is bundled with
Factory, BASE_TEMPLATE.html with HBS; Atlas bundles root/area/workflow
specification templates. Installing
through `npx skills` includes bundled resources; install both Factory and Atlas
when using delivery integration. Global aliases and AGENTS.md require this installer.

Managed former root, Factory spec and communication/specification template links
migrate even when dangling. Managed communication/specification skill links are removed on
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
