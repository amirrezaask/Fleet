# HBS writing and information design

What the words do inside an HBS page. The layout gets ADMIN to the right place; the
writing makes each place worth reading.

## The first screen

- **Echo the request.** A muted "Prompt" box under the title quotes what ADMIN asked,
  so the page's job is explicit.
- **Title states the point.** "Annotation export is ready to ship", not "Export review".
  Phrase explainers as the question they answer ("What happens when you `git push`").
- **TL;DR in a distinct box.** One paragraph: what, why, the impact number, the
  resolution or the ask. Incidents: cause → blast radius % → duration → mitigation →
  data loss (yes/no).
- **The ask with scope and date.** "Four sign-offs by Friday; ramp starts Monday."
- **Verdict up front.** Reviews open with approve / request changes; comparisons open with
  the pick. Never leave the recommendation only at the bottom.
- **Reading budget.** A chip like "90-second read" or "6 slides · ~4 min".

## Ordering

- **By what ADMIN must act on, not by chronology.** Plans sort by likelihood of tweaking
  (data model, interfaces, user-facing choices first; mechanical work collapsed last) and
  say so in a banner ("↑ tweak · ↓ trust").
- **Interviews by blast radius**: questions whose answer changes the architecture first.
- **Reviews by risk**: files needing attention first, safe files collapsed to one sentence
  ("Type-only change").
- **PR tours ordered for reading**, not alphabetically; say "start here".
- **Options cheapest first** when ADMIN will pick by appetite.

## Evidence

- **Every claim carries its source**: `file:line` chips, PR numbers, flag states, TODO age,
  commit counts. Option cards begin "Found in code: ...".
- **Scope line under the title**: "Read 47 files, 214 commits, 3 migrations."
- **Bold claim with a number, then one sentence of evidence**: "**p95 down 38%.** Batch
  writes replaced per-row inserts in `sync/write.ts`."
- **Provenance footer**: sources and generation time; "Files read" list in explainers.
- **Separate verified from assumed.** Mark unverified claims; say what was not tested.

## Making trade-offs decidable

- Each option: what it is, a concrete pro/con, and **"Pick this if ..."**.
- Recommendation names the pick and the evidence, then **"Revisit X only if ..."**.
- Alternatives in plans end with the one line ADMIN would send to choose them.
- Open questions: the question, the trade-off in numbers ("steals ~56px of player
  height"), the current leaning, and **who decides by when** ("design, before slice 2").
- Skip reasons are reasons: "low density, dies at 30 items".

## Honesty devices

- **Mark the weakest part** of a plan in a dashed clay card.
- **"What I deliberately did not do"** and **"left out on purpose"** lines.
- **Conservative-call log** during implementation: plan said / code revealed /
  conservative choice / revisit. Product calls go to ADMIN: "that's a product call, not mine",
  with size and whether it blocks.
- **Name the worst credible failure** and the rollback ("one toggle").
- **Admit wrong turns** in timelines and their cost.
- **Pre-answer objections** in `<details>`, each ending with a number and a link to evidence.
- **Name the hidden coupling** nothing in the diff would flag.

## Surfacing unknowns

- **Asked vs actual**: "What you asked for" beside "What you're actually walking into".
- **Typed findings**: landmine / history / convention / concept, each with "why it bites"
  as a concrete failure ("works in dev, silently fails in prod") and a copyable prompt fix.
- **Teach vocabulary by use**: term, meaning, then "say → ..." with an example sentence.
- **Payoff line**: show the better prompt ADMIN can now write.

## Labels and microcopy

- Mono eyebrow above each H1 (`Kind · date`), numbered section heads (`01`).
- Uppercase severity labels: BLOCKING, NIT, QUESTION.
- `best for:` under every variant; "This direction says: ..." under every design direction.
- Each step answers what this layer does **and what it does not do**.
- Gotchas are traps with consequences ("may serve it for up to 60s"), not tips.
- Next steps restate each blocking fix as an imperative naming file and symbol.
- Prototypes list "What you're feeling" (decisions and reasons) and numbered open questions.
