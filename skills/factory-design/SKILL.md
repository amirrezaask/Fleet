---
name: factory-design
description: Factory design stage, run only when the user types /factory-design. Accept the task's intent, then produce DESIGN.html with flagged concerns, decisions and design-* artifacts (mocks, diagrams) in the task directory for the user's review.
disable-model-invocation: true
---

# /factory-design

This command runs one stage of Factory's opt-in pipeline. Read the
[Factory skill](../factory/SKILL.md) first: it holds the task layout, gates, document
audiences and requirement rules this stage relies on.

Running this command accepts the task's `INTENT.html`; record the approval entry if
it is missing. Rename the task to `-inprogress`, set the stage to `design`, and follow
[the design guide](../factory/references/design.md). The stage ends when the user
accepts the design and it is committed. Do not plan or build in this command.

Arguments name the task directory or, for a new task, describe the request. End
with a commit of the stage's artifact and tell the user the next command.
