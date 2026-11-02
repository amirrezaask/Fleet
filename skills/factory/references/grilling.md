# Grilling: settle a design with the user

Use when a request is large or ambiguous enough that a single question will not
settle it, or when the user asks to be grilled or to stress-test a plan. It is the
interview method behind [intent capture](intent.md).

## Design tree and frontier

Treat the request as a **design tree**: every decision branches into the
decisions that hang off it. The **frontier** is every open decision whose
prerequisites are already settled, meaning the questions that can be asked now
without guessing at answers not yet heard.

Work in **rounds**. Ask the whole frontier in one round, then wait for the user's
answers. Answers reshape the tree: settled decisions push the frontier outward
and unblock dependent questions. Recompute the frontier before each round. A
question that depends on another question still open in this round belongs to a
later round.

## Round format

Number every question, give it a short title, and state your recommended answer.
Word each question so "yes" accepts the recommendation.

```text
Q1 - <title>: <question; include the options when it is a choice>
Recommended: <answer and the reason in one line>
```

Offer a concrete proposal to correct instead of an abstract question whenever you
can. Do not repeat a decision the user has already made.

## Facts are yours, decisions are the user's

Never ask the user for something the repository, specs, tests or tools can answer.
Look it up, or dispatch a fresh-context subagent to find it when it needs wide
reading. A running lookup is an unsettled prerequisite: only the questions that
depend on it wait; ask the rest of the frontier now. Decisions (scope, tradeoffs,
vocabulary, priorities) go to the user, and you wait for the answer.

## Done

The grilling is done when the frontier is empty: every branch visited and nothing
left silently assumed. Report what was settled, what remains an agent assumption,
and what stays unknown. Do not act on the result until the user confirms the shared
understanding; in Factory that confirmation is the intent approval.

Adapted from the grilling method in mattpocock/skills; this repository has no
dependency on it.
