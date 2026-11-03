# Factory follows the AI-native SDLC pipeline

Intent · **Approved** · created 2026-11-02 16:40 · Claude Code claude-opus-5-5

## Problem

Factory runs clarify → plan → build → verify, and loads whenever an agent does software work. The user wants the pipeline from Claude's AI-native SDLC playbook, started only on request, with documents sized to whoever reads them.

## Outcome

Factory runs Intent → Design → Plan → Build → Test, only through `/factory` and its stage commands. Each stage produces a Markdown document from a template.

## Requirements

| ID | Requirement | Accepted when |
| --- | --- | --- |
| R1 | The article's knowledge, tips and tricks are extracted, and the user's reading of the pipeline is compared with the article's. | A document in this task's `design/` folder covers every stage, the principles and the differences. |
| R2 | Factory's stages are Intent, Design, Plan, Build and Test, with the artifacts the user described: intent ≈ brief; design = AI-made artifacts; plan = agent plan with the tests decided up front; build = debrief only; test = cheap tests during build, heavy tests only in Test. | The skill and its stage guides describe these stages, artifacts and gates. |
| R3 | Factory is opt-in and runs only through `/factory` or the stage commands. | Every Factory skill disables implicit invocation, and AGENTS.md no longer requires Factory for all software work. |
| R4 | The templates follow the new format. They are short for human readers and detailed for agent readers. | Intent, design, plan, debrief, test report and task templates exist. |
| R5 | Existing tooling and legacy tasks keep working. | The board and installer handle the new documents and still read legacy BRIEF files. `npm test`, the type check and the skill check pass. |

## Boundaries

- **Non-goals:** migrating existing tasks; deploy or production automation; hooks that enforce the policies.
- **Constraints:** TypeScript tooling; the skill entrypoint stays under 150 lines.
- **Preserved:** task status directories, subtasks, the board's safety rules (`docs/specs/factory-board.spec.md`), and Atlas ownership.
- **Design:** needed. Command names, gates and the scope of each document were open.

## Open questions

- The user invited questions, but this session runs autonomously, so the agent decided them and listed each decision in `DESIGN.md` for review.

## Approval

### 2026-11-02 16:40 — Approved

The user's request in chat ("I want the same pipeline … we should refactor factory skill") gave the requirements and the go-ahead in one message, and it is recorded as the approval. It also authorizes amending `docs/specs/documentation-workflow.spec.md` and the related specs.

### 2026-11-02 — Amendment

The user's follow-up in chat: Factory must not refer to the Atlas skill (copy what it needs), design artifacts live in the task itself (a `design/` folder alongside the subtasks), task and subtask directories are flat and named `$title-$status` with no status directories, and the user is called "the user", not "ADMIN". Same branch, no new one.
