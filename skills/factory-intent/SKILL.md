---
name: factory-intent
description: Factory intent stage, run only when the user types /factory-intent. Capture what the user wants as an approved INTENT.html: clarify like an analyst, write short testable requirements, stop for approval.
disable-model-invocation: true
---

# /factory-intent

This command runs one stage of Factory's opt-in pipeline. Read the
[Factory skill](../factory/SKILL.md) first: it holds the task layout, gates, document
audiences and requirement rules this stage relies on.

Create the task as `.factory/<name>/` (or reuse the named one), set its status to
`inprogress` and its stage to `intent` in `TASK.html`. Follow
[the intent guide](../factory/references/intent.md). The stage ends when the user
approves the intent and it is committed. Do not design, plan or build in this command.

Arguments name the task directory or, for a new task, describe the request. End
with a commit of the stage's artifact and tell the user the next command.
