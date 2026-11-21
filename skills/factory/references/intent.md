# Intent: capture what the user wants

Goal: one short, approved `INTENT.md` that says what is wanted, why, and under
which constraints, in the user's own terms. It is the contract every later stage checks
against. A human reads it; keep it to one screen.

## Discover before asking

Inspect relevant code, specs, tests and supplied evidence first. Summarize what
exists today and separate observations from assumptions. For an existing task,
start from its intent instead of restarting discovery. Use the impact question in
[keeping specifications true](specifications.md) when knowledge about an affected
area or workflow is missing. Never ask the user something the
repository, specs, tests or tools can answer.

## Clarify like an analyst

Ask the questions an analyst would ask, covering the gaps that change the outcome:

- Who has the problem, what triggers it, why it matters, and what better looks like.
- Observable success, error paths, boundaries, compatibility.
- Scope, non-goals, constraints, behavior that must stay intact.
- External dependencies, and choices the user keeps or delegates.
- For a bug: reproduction, expected versus actual result, affected versions or
  inputs, evidence, and whether the cause is known or a hypothesis.

When the request is large or ambiguous, use the [grilling method](grilling.md): ask
the whole askable frontier in numbered rounds, each with a recommended answer.
Otherwise ask the most consequential question first. Follow the user's vocabulary and
build on their answers. Prefer a concrete proposal to correct over an abstract
question. Compare approaches only when they change scope, cost or experience, and
recommend one. Leave implementation decisions to Design and Plan.

## Write the intent

Use the [intent template](../templates/INTENT_TEMPLATE.md):

- **Problem** and **Outcome**, in the user's terms.
- **Requirements** with stable IDs (`R1`, `R2`, ...). Each one states an observable
  outcome (given/when/then where it helps), not an implementation.
- **Acceptance**: how the user will recognize each requirement as met. Every `R` appears
  at least once. Plan turns these into exact tests.
- **Non-goals, constraints, preserved behavior** (link area spec IDs).
- **Design**: needed or skipped, with the reason.
- **Open questions**: settle consequential ones before approval; Design carries the rest.

Mark the user's decisions and agent assumptions separately. Cut every sentence that
does not change what gets built or how it is judged.

## Approval

Show the user the intent (path, or a short summary in chat) and stop for approval.
`/factory design` or `/factory plan` on the task counts as approval. Record the
approval entry with who and when, then commit. After approval the requirements are
frozen; change them only through an amendment that the user authorized.

Adapted from repository-first discovery in
[Superpowers brainstorming](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md),
ambiguity checks in [Spec Kit](https://github.github.com/spec-kit/), and intent capture
in the [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook).
