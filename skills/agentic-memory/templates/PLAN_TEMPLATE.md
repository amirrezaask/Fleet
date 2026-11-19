<!-- Audience: implementing agents without this conversation. Be explicit and complete. Link requirements; never restate them. -->

# <Plan title>

Plan · for [INTENT.md](<INTENT.md>) and [DESIGN.md](<DESIGN.md>) · created <YYYY-MM-DD HH:mm> · <agent> <llm model>

## Objective

<One paragraph: the outcome, and the requirement and decision IDs in scope (INTENT:R1, DESIGN:D1). Preserved specs: <areas/x.md#ID>.>

## Current state

- <Relevant behavior and evidence; distinguish facts from assumptions.>
- <Paths, responsibilities, interfaces and dependencies involved.>
- <For a bug: reproduction, expected and actual result, known or suspected cause.>

## Approach

<Code-level design: data flow, interfaces and contracts, edge cases, migration, rollback and compatibility where relevant.>

## Files that change

| Path | Change | Why |
| --- | --- | --- |
| `<path>` | <add / edit / delete> | <Step and IDs> |

## Work

| ID | Action | Depends on | Done when |
| --- | --- | --- | --- |
| M1 | <Specific step, paths and interface contract> | <IDs or None> | <Observable result and the T IDs that pass> |

## Test plan

_Decided before code. Every R and D has a test. `fast` tests run during build and must be green before Verify; `heavy` tests run last, once, when the whole task is built. For a bug, T1 reproduces it and is committed failing before the fix._

| ID | Proves | Level | Tier | File or procedure | Command | Pass condition |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | <R1> | <unit / integration / e2e / visual / manual> | <fast / heavy> | `<path>` | `<exact command>` | <Expected result> |

## Risks

| ID | Risk | Mitigation | Caught by |
| --- | --- | --- | --- |
| K1 | <Possible failure or regression> | <Prevention or containment> | <T ID> |

## Interrogation

- **What could this break?** <Callers, flows, data, performance.>
- **Riskiest step:** <Step ID and why.>
- **Rejected options:** <Option: why not.>
- **Not verifiable locally:** <Check and reason; or None.>

## Handoff

- **Starting point:** <Branch or revision, workspace state, prerequisites.>
- **Must preserve:** <Decisions and contracts the implementer may not change.>
- **Open questions:** <And their effect on execution; or None.>
- **First action:** <Concrete first step.>

## Revisions

_Revise before committing the code that departs from the plan. Intent requirements and accepted design decisions stay binding._

- <YYYY-MM-DD: reason, affected IDs, impact; or None.>
