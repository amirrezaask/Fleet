---
name: factory-plan
description: Factory plan stage, run only when the user types /factory-plan. Accept the task's design, then write the agent-facing PLAN.html: files, ordered work, test plan with fast and heavy tiers, risks and interrogation.
disable-model-invocation: true
---

# /factory-plan

This command runs one stage of Factory's opt-in pipeline. Read the
[Factory skill](../factory/SKILL.md) first: it holds the task layout, gates, document
audiences and requirement rules this stage relies on.

Running this command accepts the task's `DESIGN.html` (or the recorded design skip);
record the acceptance if it is missing. Set the task status to `inprogress` in `TASK.html`, set the stage
to `plan`, and follow [the plan guide](../factory/references/plan.md). Plan read-only:
change no code. The stage ends when the plan passes its self-check and is committed.

Arguments name the task directory or, for a new task, describe the request. End
with a commit of the stage's artifact and tell the user the next command.
