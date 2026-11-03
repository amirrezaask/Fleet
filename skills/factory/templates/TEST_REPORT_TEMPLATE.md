<!-- Audience: the user first (verdict and matrix on the first screen), auditors and agents after. -->

# <Task title>: <Passed / Failed / Passed with limitations>

Test report · task `<task-name>` · revision <sha> · created <YYYY-MM-DD HH:mm> · <agent> <llm model>

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
| Review | Fresh-context bugs, security, compliance passes | <n Important, n Nit> | <Resolution> |
| Heavy | `<command>` | <result> | |

## Review findings

- <Pass · Important/Nit · finding · location · fixed in sha / accepted by the user / rejected because; or None.>

## Limitations and follow-up

- <What remains unverified and why.>
- <Out-of-scope findings and their draft-intent tasks; specs updated (paths); or None.>

## Environment and raw evidence

<Machine, versions, inputs. Raw output stays gitignored in the task's `evidence/` folder.>
