# HBS format catalog

Pick the format by the job, then take its ingredients. Each one is a single HTML
file built from the [base template](../templates/BASE_TEMPLATE.html).

## Explore and decide

| Job | Format | Ingredients |
| --- | --- | --- |
| Direction unsettled, code | **Approach comparison** | 2-4 solutions to one problem in equal cards; short code excerpt, trade-offs and a "pick this if" line each; recommendation on top |
| Direction unsettled, visual | **Design directions** | Each option rendered live (real layout and palette, not a description); labelled, same content in every option |
| Chosen option, handoff | **Implementation plan** | Numbered sections: milestones timeline, data-flow diagram (inline SVG), inline mockups, risky code highlighted, risk table, open questions |

## Review and understand code

| Job | Format | Ingredients |
| --- | --- | --- |
| Review a change | **Annotated diff** | Risk map chips linking to files; per-file diff with add/del rows, margin notes tagged blocking, nit or question; files collapsed unless they need attention; next-steps checklist |
| Explain a change | **PR writeup** | Motivation, before/after, file-by-file tour with the reasoning, where reviewers should focus |
| Learn unfamiliar code | **Module map** | Boxes and arrows from the real imports; hot path highlighted; entry points and owners listed; click a box for its role |

## Design and prototype

| Job | Format | Ingredients |
| --- | --- | --- |
| Show a design system | **Living tokens sheet** | Swatches, type scale and spacing read from the repo; click to copy values |
| Review a component | **Variant sheet** | Every size, state and intent on one page, in light and dark |
| Judge motion | **Animation sandbox** | The real transition isolated; sliders for duration and easing; replay; copy the final values |
| Judge a flow | **Clickable flow** | A few linked screens at low fidelity; enough to feel the interaction |

## Explain, research, report

| Job | Format | Ingredients |
| --- | --- | --- |
| Explain a feature | **Feature explainer** | Summary box first; collapsible request-path steps; tabbed or stacked config snippets; FAQ |
| Explain a concept | **Concept explainer** | A live model ADMIN can poke (add a node, change a number), comparison table, glossary |
| Show a process | **Annotated flowchart** | SVG pipeline; click a step for what runs, timing and failure path |
| Recurring status | **Status report** | Shipped, slipped, next; one small chart; scannable in 30 seconds |
| Post-mortem | **Incident timeline** | Minute-by-minute events with log excerpts, cause, impact, follow-up checklist |
| Present | **Deck** | One `<section>` per slide, arrow-key navigation, no build or export step |
| Illustrate | **SVG figure sheet** | Figures drawn inline, each copyable on its own |

## Edit and tune (custom editors)

Use when a text box cannot express what ADMIN wants to change. Build a throwaway
tool for exactly this task, and always end with **Copy as text**:

- **Triage board:** drag items into Now / Next / Later / Cut; export the ordering as a list.
- **Config or flag editor:** grouped toggles, warnings when a prerequisite is off, copy only the changes.
- **Prompt or template tuner:** editable template with highlighted variable slots and sample inputs that re-render live.

## Choosing quickly

- Several valid answers: comparison first, then converge.
- Anything with shape (flow, structure, timeline, diff): draw it.
- Anything ADMIN will tweak: make it a control with export.
- Anything recurring: keep a stable layout so scanning gets faster each time.
- Nothing spatial, visual or interactive: answer in chat instead.
