---
name: factory-test
description: Factory test stage, run only when the user types /factory-test. Verify a built task: regression, acceptance, fresh-context review, heavy gates; write the test report, update specs and close the task.
disable-model-invocation: true
---

# /factory-test

This command runs one stage of Factory's opt-in pipeline. Read the
[Factory skill](../factory/SKILL.md) first: it holds the task layout, gates, document
audiences and requirement rules this stage relies on.

Rename the task to `-inprogress`, set the stage to `test`, and follow
[the test guide](../factory/references/test.md). Only the managing agent runs this
stage. It ends with the report in `docs/reports/`, the specs updated, and the task
renamed to `-done`, or with failures fixed and re-verified, or the task renamed to `-blocked`.

Arguments name the task directory or, for a new task, describe the request. End
with a commit of the stage's artifact and tell the user the next command.
