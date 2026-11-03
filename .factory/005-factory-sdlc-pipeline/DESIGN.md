# Factory pipeline design

Design · **Accepted by agent; awaiting the user's review** · for [INTENT.md](INTENT.md) · created 2026-11-02 16:45 · Claude Code claude-opus-5-5

## Flagged concerns

| ID | Concern | Options | Recommendation | Resolution |
| --- | --- | --- | --- | --- |
| C1 | The playbook has stages after Test, Deploy and Maintain, that the user's list leaves out. | A: add `/factory-review` and `/factory-ship`. B: fold review into Test and keep only the loop-back. | B. Factory doesn't deploy anything. A fresh-context review inside Test covers the review pass. | Agent decided B. The user can revisit. |
| C2 | Should a human approve the plan? The playbook says the engineer accepts it. The user called the plan agent-facing. | A: human gate. B: agent self-check, then commit before any code. | B, with the user able to ask for a review. | Agent decided B. |
| C3 | The user invited questions, but the session hook requires autonomous work. | Ask, or decide and record. | Decide and record here. | Decided. Every decision on this page can be changed. |

## Decisions

| ID | Decision | Rejected alternatives | Serves |
| --- | --- | --- | --- |
| D1 | Commands: `/factory` is a router that stops at human gates. `/factory-intent`, `-design`, `-plan`, `-build` and `-test` are thin skills that point into the shared Factory contract. | Arguments to one skill (`/factory plan`): hosts list only skill names as slash commands. | R2, R3 |
| D2 | Opt-in: `disable-model-invocation: true` for Claude Code and `allow_implicit_invocation: false` for Codex, plus AGENTS.md wording. | Wording alone. Hosts would still auto-load Factory from its description. | R3 |
| D3 | Gates: running the next stage's command accepts the previous artifact. Intent and design need the user. The plan passes an agent self-check. | A separate "approve" command, which adds a step and no extra control. | R2 |
| D4 | Design holds flagged concerns and decisions, plus a `design/` folder of artifacts in the task directory (mocks, diagrams, schemas). It can be skipped with a reason. | Mocks only. The playbook's spec also carries decisions and concerns. | R2 |
| D5 | The plan's test plan tags each test `fast` or `heavy`. Build owns fast tests. Test reruns them as regression, then runs the heavy ones. A bug fix starts with a committed failing test. | Untiered gates, where nobody knows what must pass before Test. | R2 |
| D6 | `DEBRIEF.md` lives in the task directory and is written in Build. The test report is `REPORT.md` in the task directory (amended 2026-11-02; it was `docs/reports/`). | Debrief in reports, which mixes build notes with verification evidence. | R2, R4 |
| D7 | `TASK.md` carries a `stage` frontmatter key. Status means who is working on the task, so `backlog/` can hold a task at any stage. | A status directory per stage, which would break the board and existing tasks. | R2, R5 |
| D8 | Loop-back: out-of-scope findings become draft-intent tasks in `backlog/`. Repeated mistakes become proposed memory edits. | Silent fixes, or findings left in a report. | R2 |
| D9 | Legacy `BRIEF.*` counts as the intent. The board falls back to it, and the installer removes the old BRIEF template alias. | Migrating every task. | R5 |

## Artifacts

- [design/playbook-knowledge.md](design/playbook-knowledge.md): the knowledge extracted from the article, stage tips, the comparison with the user's pipeline, and measures (R1).

## Carried from the intent

- Questions for the user: resolved by C1–C3, which the user can revisit.
