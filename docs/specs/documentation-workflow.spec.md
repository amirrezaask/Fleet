---
title: "Factory workflow"
---

## Area

`skills/factory/` and its stage commands `skills/factory-{intent,design,plan,build,test}/`
own the opt-in delivery pipeline: intents, designs, plans, debriefs, test reports and
task metadata. Factory is self-contained: it carries its own guide for keeping
specifications true and the area and workflow templates it needs, and never refers to
Atlas.

Requirements R1-R10 were amended on 2026-11-02 by ADMIN's request to adopt the AI-native
SDLC pipeline (task `factory-sdlc-pipeline`), and R4, R5, R9 and R10 again the same day for
the flat task layout; the earlier text is in Git history.

## Requirements

- **R1:** Given any request, when no `/factory` or `/factory-<stage>` command was typed, then Factory does not run and no task is created; every Factory skill declares `disable-model-invocation: true` and `allow_implicit_invocation: false`. Research alone never authorizes implementation.
- **R2:** Given a Factory task, when it moves through the pipeline, then the stages are Intent, Design, Plan, Build and Test, in that order; each stage ends by committing its artifact and the next starts by reading it. Design may be skipped only with the reason recorded in the intent.
- **R3:** Given the gates, when leaving Intent or Design, then the user's approval is required and recorded; running the next stage's command counts as approval. The plan needs no human approval but must pass its self-check and be committed before any implementation.
- **R4:** Given a task, when its documents are written, then `docs/tasks/<task-name>-<status>/` holds `TASK.html` (with `<meta name="stage">`), `INTENT.html`, optional `DESIGN.html` with its artifacts in a `design/` folder next to the subtask directories, `PLAN.html` and `DEBRIEF.html`; the test report lives at `docs/reports/YYYY-MM-DD-<task>.html`. The last hyphen segment of the directory name is the only status record; changing status renames the directory, and there are no status directories. Intent, design and the report's first screen are short and written for the user; plan and debrief are complete and written for agents. Legacy `BRIEF.*` files count as the intent, and legacy `docs/tasks/<status>/<task>/` directories stay readable.
- **R5:** Given delivery resources, when resolving templates, then the intent, design, plan, debrief, test report and task templates each have one canonical HTML file in `skills/factory/templates/`, next to copies of the area and workflow specification templates Factory uses.
- **R6:** Given a plan, when it is written, then it names the files that change, the ordered work, risks, an interrogation (what could break, riskiest step, rejected options), and a test plan that maps every requirement to tests, each tiered `fast` or `heavy`, before any code exists. A bug fix starts with a committed failing test that the fix does not edit.
- **R7:** Given build, when implementation departs from the plan, then the plan is revised in the same commit; requirements and accepted design decisions change only with the user's recorded authorization. Build ends with every `fast` test passing and `DEBRIEF.html` recording deviations, abnormalities, lessons and memory candidates.
- **R8:** Given Test, when verifying, then regression runs first, then acceptance with evidence per requirement, then a fresh-context review (bugs, security, compliance with intent, design and plan), then heavy gates. Only the managing agent runs heavy gates. Checks record observed results; a passing suite alone does not prove coverage.
- **R9:** Given task closeout, when declaring completion, then every requirement is evidenced, the debrief and test report exist, affected specs match verified behavior, and the task directory is named `<task>-done`. A manually set done status does not establish these facts. Out-of-scope findings become draft-intent tasks named `<name>-backlog`.
- **R10:** Given a task with separable parts, when creating subtasks, then each is a child directory `<task>-<status>/<subtask>-<status>/` with the same documents, nests to any depth, needs no approval from the user for its intent, and refines but never contradicts its parent. A task reaches `done` only after all descendants are done and its own Test passes. On resume, the agent reconciles TASK.html, the stage documents, specs and the Git diff before continuing.
