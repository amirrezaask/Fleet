# Design: decide how it should look and work

Goal: turn the approved intent into the product and architecture decisions an
engineer can plan against, with every concern flagged up front. The user reviews the
design but does not write it. Requirements and design happen in one session.

## Inputs

Read `INTENT.html`, the affected specs and workflows under `docs/`, and the code paths
involved. Load the skills that encode the policies the change touches (UI craft,
accessibility, security, performance, the project's Effect or React patterns) and
apply them **while** designing, not in a later review.

## Produce

1. **Flagged concerns.** Every place where the intent cannot be met as written, where
   two requirements or policies conflict, where a risk or cost is unclear, or where
   an open question needs the user. Each concern names the options and a recommendation.
   These come first; the user resolves them before anything else.
2. **Decisions.** For each consequential choice: what was chosen, the alternatives
   rejected and why, and the requirement IDs it serves. Cover only choices that change
   what the user sees, the system's shape, data ownership or contracts.
3. **Artifacts in the task's `design/` folder,** next to its subtasks
   (`design/mock.html`, `design/flow.html`, `design/states.png`). Make the decision
   visible, not described:
   - UI: a clickable HTML mock using the project's real tokens, components and copy,
     with states (empty, loading, error, long content) and phone width. Iterate on the
     mock with the user before planning.
   - Flows and architecture: an HTML page with an SVG diagram of the actual mechanism
     (see [HBS](../../hbs/SKILL.md)).
   - Data and contracts: schemas, type shapes, API examples.
   - Images or screenshots when they are the clearest evidence.
4. **Open questions carried forward** from the intent, each answered or still open.

Use the [design template](../templates/DESIGN_TEMPLATE.html). Keep `DESIGN.html` to a
short page: concerns, decisions, artifact links. The artifacts hold the detail.

## Review with the user

Self-check before presenting: does the design solve the stated problem, does every
requirement map to a decision or need none, is every intent question answered or
carried forward? Present the concerns first, then the artifacts. Revise until the user
accepts. `/factory-plan` on the task counts as acceptance. Record it, commit
`DESIGN.html` and `design/`, and move the stage to `plan`.

A design never changes a requirement. When a concern can only be solved by changing
one, ask the user for an intent amendment.

## Skipping design

Skip when no product or architecture decision is open, such as an isolated bug fix,
a mechanical refactor or a dependency bump. The intent records the skip and the
reason; Plan then reads the intent directly.
