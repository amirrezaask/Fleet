# Task documents and local board

## Layout

Every task is one flat directory named `<task-name>-<status>`:

```text
docs/tasks/
  account-recovery-inprogress/
    TASK.html  INTENT.html  DESIGN.html  PLAN.html  DEBRIEF.html
    design/                                                   # design artifacts
      flow.html  mock.html  states.png
    email-token-done/                                         # subtask, same layout
    rate-limit-backlog/
  export-csv-backlog/
```

`<status>` is the **last** hyphen segment of the directory name and is one of:

| Suffix | Board column | Meaning |
| --- | --- | --- |
| `-backlog` | Backlog | Captured; nobody is working on it (any stage before `done`) |
| `-inprogress` | In progress | An agent is working on it, in any stage |
| `-blocked` | Blocked | A recorded decision or dependency prevents progress |
| `-done` | Done | Test passed: requirements evidenced, debrief and report written, specs updated |

The name before the suffix is lowercase ASCII letters and numbers separated by single
hyphens, unique among its siblings. Reuse existing tasks; never overwrite another
task to resolve a collision. Change status by renaming the directory
(`git mv docs/tasks/export-csv-backlog docs/tasks/export-csv-inprogress`) and updating
`updated`. The name is the status record; `TASK.html` has no status field.

Everything that belongs to a task sits directly in its directory: the stage
documents, a `design/` folder with the design artifacts, and its subtasks. Nothing else
goes there; `design` never ends in a status suffix, so it is never mistaken for a
subtask. Link between a task's own files with relative paths (`design/mock.html`,
`../DESIGN.html`) so links survive renames, and link to `docs/reports/` by a path from the repo root.

## Metadata

`TASK.html` carries a nonempty `<title>`, `<meta name="created">` and
`<meta name="updated">` ISO dates, and `<meta name="stage">` (`intent`, `design`,
`plan`, `build`, `test`, `done`). The stage is the pipeline position; the status is
whether anyone is working on it. Record blockers and the report link in the body.
A status change is bookkeeping: it does not approve work, run plans, prove
completion or start sessions.

## Subtasks

A subtask is a child directory of its task with the same naming and files,
`<subtask-name>-<status>/`. A subtask intent needs no approval from the user but
refines, never contradicts, its parent's; record "Approval: not required, subtask
of `<parent>`". Subtasks nest without limit. Renaming a parent carries its subtasks
with it. The board shows a done/total count over all descendants and never moves
subtasks by itself. Dependencies between siblings live in `TASK.html` under
`## Depends on`; see [subtask graphs](subtasks.md).

## Legacy layout

Older projects use `docs/tasks/<status>/<task-name>/` with `subtasks/<status>/`
nesting, a `BRIEF` as the intent and a `design/` folder. They stay readable; do not
migrate them unless the user asks. A legacy task that an agent works on may be moved
to the flat layout in its first status change.

## One shared board

A single board serves every project; projects do not carry a copy. Run it with
`npx amirreza-factory [project-dir...]` (from this repository, `npm link` inside
`skills/factory/assets/task-board/` after `npm install` there, then run
`amirreza-factory`). Node.js 24+ is required. Listed directories are registered;
with none given and an empty registry the current directory is adopted if it has
`docs/tasks/`. Registered projects persist in `~/.factory/projects.json`
(`FACTORY_HOME` overrides the directory) and can also be added or removed in the
UI header (a native folder dialog opens on the host; light/dark follows the system with a header toggle). The board binds to `127.0.0.1` on any free port (PORT overrides) and
reports the URL. Leave a preview running only when the user asks to use it. Never
add `server.ts`, `index.html`, fonts or a `factory:board` script to a project.

The header shows the selected project name and a project switcher; the name is read from package.json
`displayName`, then `name`, then the project directory. React renders it as text.
Claude-reference cream/charcoal/clay tokens, locally served Anthropic Serif/Sans,
and restrained transitions carry the visual language. Motion respects reduced
motion. [Font sources](../assets/task-board/FONTS.md) are recorded with the assets.
