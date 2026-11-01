# HBS format catalog

Pick the format by the job, then take its ingredients. Each one is a single HTML file
built from the [base template](../templates/BASE_TEMPLATE.html). Visuals inside come from
the intent tables in [dataviz.md](dataviz.md); controls from
[interactions.md](interactions.md). Every format opens with the title stating the point,
the quoted prompt, and the answer or ask on the first screen.

## Explore and decide

| Job | Format | Ingredients |
| --- | --- | --- |
| Direction unsettled, code | **Approach comparison** | 2-4 equal cards: number, title, one-line thesis, short code excerpt, pro/con dot grid, the same metric chips on every card, "pick this if"; recommendation with evidence and a "revisit if" trigger on top |
| Direction unsettled, visual | **Design directions** | Each option rendered live on one shared dataset (design is the only variable); letter label, "this direction says:" line, steal/skip chips that assemble the reply; 2-4 options |
| Solution space unexplored | **Option spectrum** | Headline insight, spectrum strip cheap → ambitious, code-grounded cards ("Found in code: ...") with effort pill and impact line, "resonates" checkboxes feeding a sticky reply bar |
| Chosen option, handoff | **Implementation plan** | Summary strip (effort, surfaces, tables, flag); milestone timeline; data-flow SVG with stated line encoding; inline mockups marked "not pixel-final"; only the risky code; severity risk table; open questions with leaning, owner and deadline |
| Plan ADMIN will adjust | **Tweakable plan** | Sorted by likelihood of tweaking ("↑ tweak · ↓ trust"): flagged schema/interface choices with pick/alternative toggles, code with margin notes, weakest part in a dashed card, sequence with estimates, mechanical work collapsed; one-line tweak replies to copy |

## Surface unknowns (before implementation)

| Job | Format | Ingredients |
| --- | --- | --- |
| Entering unfamiliar code | **Blindspot pass** | Scope line (files, commits read); asked-vs-actual grid; stat strip by type; typed cards (landmine / history / convention / concept) each with "why it bites" and a copyable prompt fix; all fixes folded into one improved prompt with a stop-and-show gate |
| ADMIN lacks the domain words | **Vocabulary explainer** | Pipeline strip with the relevant steps highlighted; term ladder (term, meaning, "say → ..." example); a live before/after you can tune with presets; checklist of what good looks like; prompts ADMIN can now write |
| Requirements ambiguous | **Interview** | One question at a time ordered by blast radius; progress rail colored by radius; "why it matters" line; option cards with their cost; "Other" input; decisions table with edit links and a generated prompt stating which decisions are fixed |
| Layout or UX uncertain | **Throwaway mock** | Clickable low-fidelity stage with a variant segmented control; open questions with A/B chips stating the trade-off in numbers; reply template with visible blanks |
| Porting or copying a reference | **Semantics map** | "Awaiting confirmation" badge; what it does; side-by-side code with linked numbered highlights; preserved / changed / dropped columns; edge-case match table; copy "confirmed" or a correction template |

## During and after implementation

| Job | Format | Ingredients |
| --- | --- | --- |
| Long build in progress | **Implementation notes** | Stat tiles (entries, deviations, need-your-judgment); filter chips; event timeline typed confirmed / deviation / discovery / for-you; deviation grid plan said / code revealed / conservative choice / revisit; bullets for the next attempt |
| Others must approve | **Buy-in doc** | Conclusion title, the ask with dates, reading-time chip; demo first; one-paragraph pitch with a number; objections pre-answered in `<details>` with evidence links; risk and rollback; per-person sign-off scope |
| Prove the change is understood | **Change quiz** | Before/after flow pair; non-obvious behaviors as What / Why / Where (`file:line`); hidden-coupling callout; scenario quiz that links misses back to sections; "cleared to merge" checklist |

## Review and understand code

| Job | Format | Ingredients |
| --- | --- | --- |
| Review a change | **Annotated diff** | Verdict and "what this PR does" first; risk map chips with legend; file cards sorted by risk with grid diff rows and anchored BLOCKING / NIT / QUESTION bubbles explaining the failure mechanism; safe files collapsed to one sentence; imperative next-steps checklist |
| Explain a change | **PR writeup** | TL;DR; why with before/after ending on the same metric; file tour ordered for reading with NEW/MOD/DEL badges and the important files open; where to focus with `file:line` and why; test plan; rollout strip with guardrails; what I deliberately did not do |
| Learn unfamiliar code | **Module map** | Four-sentence summary that ends on the takeaway; SVG from the real imports with the hot path in clay; numbered walkthrough linked to the diagram ("what it does, what it does not"); sticky aside with key files (path + role) and gotchas |

## Design and prototype

| Job | Format | Ingredients |
| --- | --- | --- |
| Show a design system | **Living tokens sheet** | Swatches, type scale, spacing ruler, radius and elevation read from the repo; raw value and token name on every sample; live components; click to copy; name the source files |
| Review a component | **Variant sheet** | Every size, state and intent; live controls writing CSS variables; "best for:" per variant; code snippet that follows the controls; light and dark side by side |
| Judge motion | **Animation sandbox** | The real transition isolated; easing and duration controls via one `--ease`; keyframe track; replay; copy the final CSS |
| Judge a flow | **Clickable flow** | A few linked screens at low fidelity; "what you're feeling" notes with reasons and deliberate omissions; numbered open questions |

## Explain, research, report

| Job | Format | Ingredients |
| --- | --- | --- |
| Explain a feature | **Feature explainer** | TL;DR naming entry point, mechanism, failure response and config default; collapsible request-path steps with `file:line`; tabbed config / call site / response; gotchas; FAQ; "files read" list |
| Explain a concept | **Concept explainer** | Problem stated with quantities; a live model ADMIN can poke with a diff readout; comparison table with good/bad cells; hover-linked glossary |
| Show a process | **Annotated flowchart** | Title as a question; SVG with decisions, dashed failure edges and timing sublines; click a step for what runs, timing and failure path; legend |
| Recurring status | **Status report** | Stat band; highlights as bold claim + number + evidence; shipped table; one single-accent chart with caption; carryover with in review / blocked / slipped and owner; sources footer |
| Post-mortem | **Incident timeline** | ID, severity and status pills; TL;DR box; event timeline with wrong turns admitted; root cause with diff; impact table always listing data loss and SLA; action items with owner and due date |
| Present | **Deck** | Scroll-snap slides, arrow keys, n / N counter; title promises the one decision needed; KPI and sparkline slides; inverted decision slide with the leaning option marked |
| Illustrate | **SVG figure sheet** | Standalone SVGs (own style block and background) with caption, intended placement and download button; a palette-and-rules section |

## Edit and tune (custom editors)

Use when a text box cannot express what ADMIN wants to change. Build a throwaway tool for
exactly this task, state → render → export, and always end with **Copy as text**:

- **Triage board:** drag (and keyboard-move) items into Now / Next / Later / Cut, each column
  with a one-line rationale and point totals; filter by dimming; export the ordering with
  rationale as a list.
- **Config or flag editor:** grouped toggles with live counts, dependency warnings in place,
  sticky pending-changes panel; copy only the changed keys as a diff, or the full file.
- **Prompt or template tuner:** template with highlighted slots and unknown slots flagged,
  live char/token count, 2-3 deliberately different sample inputs re-rendering live.

## Choosing quickly

- Several valid answers: comparison first, then converge.
- ADMIN cannot yet say what they want: show options, a mock, or an interview, not a plan.
- Unfamiliar territory: blindspot pass or vocabulary explainer before any plan.
- Anything with shape (flow, structure, timeline, diff, numbers): draw it with the right
  visual from [dataviz.md](dataviz.md).
- Anything ADMIN will tweak or answer: make it a control with a live reply and export.
- Anything others must sign: buy-in doc. Anything you must be sure was understood: quiz.
- Anything recurring: keep a stable layout so scanning gets faster each time.
- Nothing spatial, visual or interactive: answer in chat instead.
