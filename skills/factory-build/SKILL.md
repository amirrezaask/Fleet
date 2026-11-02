---
name: factory-build
description: Factory build stage, run only when the user types /factory-build. Implement the task's committed PLAN.html with its fast tests green, keep the plan in sync, and write DEBRIEF.html.
disable-model-invocation: true
---

# /factory-build

This command runs one stage of Factory's opt-in pipeline. Read the
[Factory skill](../factory/SKILL.md) first: it holds the task layout, gates, document
audiences and requirement rules this stage relies on.

Rename the task to `-inprogress`, set the stage to `build`, and follow
[the build guide](../factory/references/build.md). Without a committed plan, run
the plan stage first. The stage ends when the planned scope is implemented, every
`fast` test passes, and `DEBRIEF.html` is committed. Do not run heavy gates here.

Arguments name the task directory or, for a new task, describe the request. End
with a commit of the stage's artifact and tell the user the next command.
