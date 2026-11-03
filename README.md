# Global agent instructions and skills

`AGENTS.md` holds global conventions. Factory is an opt-in delivery pipeline,
Intent → Design → Plan → Build → Test, started only by `/factory` or a stage
command. Atlas owns software specification discovery, structure and templates;
Factory uses its maintenance guidance during delivery.

## Skills

| Skill | Task trigger |
| --- | --- |
| `factory` | Only `/factory`: route a task through the pipeline, stopping at human gates; task board |
| `factory-intent`, `factory-design`, `factory-plan`, `factory-build`, `factory-test` | Only the matching `/factory-<stage>` command: run that one stage |
| `atlas` | Explicit `/atlas` initialization and documentation of an existing project |
| `hbs` | Any HTML document an agent makes to communicate with ADMIN: explainers, comparisons, reviews, reports, charts, questionnaires, editors |
| `configure-oxlint` | Base Oxlint/Oxfmt policy and upstream anti-slop skill installation |
| `performance` | Systems, browser, and GPU performance investigations and optimization |
| `resource-bounded-runs` | Large copies and resource-heavy build or test processes |

## Factory pipeline

Adapted from the [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook):
every stage commits one artifact that the next stage reads, and the user's attention
goes to the gates.

| Stage | Command | Artifact | Reader | Gate |
| --- | --- | --- | --- | --- |
| Intent | `/factory-intent` | `INTENT.html` | The user, one screen | The user approves |
| Design | `/factory-design` | `DESIGN.html` + `design/` mocks and diagrams | The user reviews | The user accepts (or skip recorded) |
| Plan | `/factory-plan` | `PLAN.html` with a fast/heavy test plan | Agents, verbose | Self-check, committed before code |
| Build | `/factory-build` | Code, tests, `DEBRIEF.html` | Future agents | Fast tests green |
| Test | `/factory-test` | `REPORT.html` in the task | The user, verdict first | Regression, acceptance, fresh review, heavy gates |

Skills use `disable-model-invocation: true` (Claude Code) and
`agents/openai.yaml` `allow_implicit_invocation: false` (Codex), so hosts never load
them implicitly. Stage commands are thin entrypoints; the [Factory skill](skills/factory/SKILL.md)
holds the shared contract and `skills/factory/references/<stage>.md` holds each stage's
method. Tasks live in `.factory/<task>/` with their status in `TASK.html`; the optional board shows the
stage and the Intent/Design/Plan/Debrief documents.

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

Factory's task/intent/design/plan/debrief/test-report templates and Atlas's specification templates are HTML too;
they keep their own structure and reuse the same tokens.

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
  README.html
  architecture.html
  domain.html
  data-model.html
  quality.html
  operations.html
  areas/<area-name>.html
  workflows/<flow-name>.html
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

Run `/factory <request>` (or one stage command at a time). The task then lives in:

```text
.factory/<task-name>/               # name never changes
  TASK.html         # title, dates, status (backlog | inprogress | blocked | done), stage, blocker, report link
  INTENT.html       # approved requirements (one screen, for the user)
  DESIGN.html       # flagged concerns, decisions, links into design/
  design/           # design artifacts: mocks, diagrams, prototypes, images
  PLAN.html         # agent-facing plan, test plan, recorded revisions
  DEBRIEF.html      # build notes for future agents and engineers
  REPORT.html       # test report, verdict first
  evidence/         # raw test output (gitignored)
  subtasks/<subtask-name>/   # same files; no approval from the user needed
```

New task documents are HTML, built from Factory's `TASK_TEMPLATE.html`,
`INTENT_TEMPLATE.html`, `DESIGN_TEMPLATE.html`, `PLAN_TEMPLATE.html`,
`DEBRIEF_TEMPLATE.html` and `TEST_REPORT_TEMPLATE.html` (the test report is the
task's `REPORT.html`). Older `BRIEF.*`, `TASK.md` and
`PLAN.md` files stay readable; the board shows a legacy brief as the intent.

A task's status is the `status` meta tag in its `TASK.html`; change it by editing the tag
or with the board, never by renaming the directory. Tasks in older layouts (`<task>-<status>/`,
`<status>/<task>/`, `docs/tasks/`) must be migrated before the board or hook reads them
([task layout](skills/factory/references/tasks.md)). Subtasks are full tasks nested in their parent's `subtasks/` folder, and they nest recursively: a
subtask can have subtasks, to any depth. Their intents refine the parent
intent and need no approval from the user, and the parent finishes only when all of its
subtasks, at every depth, are done.

Agents may revise the plan while preserving the intent, accepted design and
existing area-spec requirements. Requirement changes need the user's explicit
authorization. Test runs regression, acceptance, a fresh-context review, then heavy
gates. Test reports live in their task directory; system specifications live directly under `docs/`, with area
rules/contracts in `docs/areas/` and actor flows in `docs/workflows/`. Existing
`docs/specs/` files remain in place until an authorized migration.

The optional board groups cards into Backlog, In progress, Blocked, and Done (one per status directory) and shows subtask progress on parent cards.
The single-file React app in `index.html` uses adapted shadcn components and
Tailwind. Cards show the task's stage and open a modal with rendered Intent, Design, Plan and Debrief tabs. Drag-and-drop or keyboard moves move the task directory and update
`TASK.html` (or a legacy `TASK.md`); they never launch sessions or prove that work is complete.
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

Selected installs include Factory, Atlas and the global files. The global
`BRIEF_TEMPLATE.html`, `PLAN_TEMPLATE.html`, `DEBRIEF_TEMPLATE.html`, and
`SPEC_TEMPLATE.html` aliases remain available. Brief/plan/debrief aliases point into
`skills/factory/templates/`; SPEC_TEMPLATE.html points to
`skills/atlas/templates/AREA_TEMPLATE.html`. TASK_TEMPLATE.html is bundled with
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
