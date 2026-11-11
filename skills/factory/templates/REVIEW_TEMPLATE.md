<!-- Audience: the user first (verdict and matrix on the first screen), auditors and agents after. -->

# <Task title>: <Passed / Failed / Passed with limitations>

Review · task `<task-name>` · revision <sha> · created <YYYY-MM-DD HH:mm> · <agent> <llm model>

> <One or two sentences: is it done, what was proven, and anything the user must decide.>

## Requirements

| ID | Requirement (short) | Evidence | Result |
| --- | --- | --- | --- |
| R1 | <Short name> | <T IDs, screenshot, output> | <Passed / Failed / Not run> |

## Gates

| Gate | Command or procedure | Result | Notes |
| --- | --- | --- | --- |
| Regression | `<command>` | <counts> | <Pre-existing failures, reproduced on base revision> |
| Acceptance | <procedure> | <result> | |
| Heavy | `<command>` | <result> | |

## Review

_Written by `/factory review`: one section per reviewer subagent. Mark a lens "Skipped: <reason>" when it does not apply (UI and UX when no interface changed). Add a round heading when a later round re-runs a reviewer (at most 3 rounds, then `blocked`). Each reviewer's reply begins with the line `VERDICT: PASS` or `VERDICT: CHANGES`; the verdict below mirrors it._

### Code

**Verdict:** <PASS / CHANGES / Skipped: reason>

| # | Severity | Location | Finding | Resolution |
| --- | --- | --- | --- | --- |
| 1 | <Important / Nit> | `<path:line>` | <Problem and the fix wanted> | <Fixed in sha / accepted by the user / rejected because>; or None. |

### Security

**Verdict:** <PASS / CHANGES / Skipped: reason>

| # | Severity | Location | Finding | Resolution |
| --- | --- | --- | --- | --- |
| 1 | <Important / Nit> | `<path:line>` | <Problem, impact and the fix wanted> | <Resolution>; or None. |

### UI

**Verdict:** <PASS / CHANGES / Skipped: reason>

| # | Severity | Location | Finding | Resolution |
| --- | --- | --- | --- | --- |
| 1 | <Important / Nit> | `<path or screen>` | <Problem and the fix wanted> | <Resolution>; or None. |

### UX

**Verdict:** <PASS / CHANGES / Skipped: reason>

| # | Severity | Flow or screen | Finding | Resolution |
| --- | --- | --- | --- | --- |
| 1 | <Important / Nit> | <Flow> | <Problem and the fix wanted> | <Resolution>; or None. |

## Limitations and follow-up

- <What remains unverified and why.>
- <Out-of-scope findings and their backlog lines; specs updated (paths); or None.>

## Environment and raw evidence

<Machine, versions, inputs. Raw output stays gitignored in the task's `evidence/` folder.>
