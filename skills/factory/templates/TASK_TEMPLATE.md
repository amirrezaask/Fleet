---
title: <Task title>
created: "<YYYY-MM-DD>"
updated: "<YYYY-MM-DD>"
stage: <intent | design | plan | build | review | done>
status: <backlog | inprogress | blocked | done>
---

# <Task title>

## Context

<Optional context or links. `INTENT.md`, `DESIGN.md`, `PLAN.md` and `DEBRIEF.md` in this directory are canonical. The pipeline stage is in the `stage:` frontmatter key and the status in `status:`; this directory's name never changes. For a subtask, name the parent task.>

## Blocker

<Reason and required decision or dependency when blocked; otherwise None.>

## Outcome

<Link to `REPORT.md` once Build has verified.>

## Depends on

<Sibling subtasks that must be done first, or None. Subtasks only.>

## Subtasks

<Names of subtask directories in this task's `subtasks/` folder, or None.>
