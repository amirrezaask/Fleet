---
name: hbs
description: HTML-based communication. Use whenever an agent creates an HTML document to communicate with ADMIN, such as an explainer, comparison, plan, review, report, diagram, chart, prototype, questionnaire or custom editor. Picks the right format and visualization for the intent and applies the Claude-style tokens.
---

# HBS: HTML-based communication

Address the user as ADMIN. All agent artifacts are HTML (see `AGENTS.md`). This skill
decides **what shape** an HTML document takes so ADMIN grasps it fast and can act on it.
Factory's structured documents (intent, design, plan, debrief, test report, task) keep their own templates; use
this skill for everything else ADMIN reads, compares, answers or edits, and for the
visuals inside Factory documents.
Source: [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/)
and its [Know your unknowns](https://thariqs.github.io/html-effectiveness/unknowns/) pages.

## References

| File | Read when |
| --- | --- |
| [formats.md](references/formats.md) | Choosing the document format for the job (always) |
| [dataviz.md](references/dataviz.md) | Showing any data, structure, flow, time or comparison (intent → visual table first) |
| [interactions.md](references/interactions.md) | Adding any control, copy/export, reply assembly, tabs, quiz, deck |
| [writing.md](references/writing.md) | Writing the first screen, ordering sections, evidence and trade-offs |
| [BASE_TEMPLATE.html](templates/BASE_TEMPLATE.html) | Starting every file: tokens, components, copy helper |

## When HTML earns its place

Use HTML when the content is **spatial, visual, comparative or interactive**: options
side by side, diagrams, diffs, timelines, numbers that need a shape, state, sliders,
anything ADMIN must react to rather than just read. HTML is also the best way to
**surface unknowns**: blindspots, vocabulary, taste, ambiguous requirements. Plain chat
text is still right for a short answer, a yes/no, or a single fact. Never write Markdown
artifacts.

## Workflow

1. **Name the job and the moment.** What should ADMIN be able to do after opening this:
   decide, review, understand, tune, answer, approve, or hand off? Before, during or after
   implementation? Pick the format in [formats.md](references/formats.md).
2. **Name what each visual must show.** For every piece of data or knowledge, state the
   relationship (one number, a change, a ranking, a share, a trend, a sequence, a
   dependency, a trade-off) and take the visual from the intent tables in
   [dataviz.md](references/dataviz.md). If no row fits, use a sentence or a table. Never
   pick a chart for looks; one visual per point, its takeaway in the caption.
3. **Start from the shell.** Copy [the base template](templates/BASE_TEMPLATE.html). Delete
   what you do not use; add components only when the job needs them.
4. **Lead with the answer.** Title states the point; quote ADMIN's request in the prompt
   box; TL;DR, verdict or the ask on the first screen, then evidence. Order the rest by what
   ADMIN must act on (risk, blast radius, likelihood of tweaking), not chronology. See
   [writing.md](references/writing.md).
5. **Fan out, then converge.** For open questions render several options on one shared
   dataset with the same comparison keys, then say which you recommend, why, and when to
   revisit.
6. **Ground every claim.** `file:line`, PR, flag state, numbers. Mark assumptions, the
   weakest part, and what was deliberately left out.
7. **Close the loop.** Anything ADMIN can change (choices, order, sliders, answers) feeds a
   live reply preview and a **Copy as text** control that produces a prompt, list, diff or
   config ADMIN pastes back. Unanswered items stay visible as blanks. See
   [interactions.md](references/interactions.md).
8. **Save and point.** Write the file where the project's rules say (the task directory
   for task documents and reports, `docs/reports/` for other results, `.work/` for scratch)
   and give ADMIN the full path. Use an Artifact or SendUserFile when ADMIN is away from the machine.

## Design rules (Claude style)

- **One self-contained file.** Inline CSS and JS, inline SVG for drawings. No build step,
  no framework, no chart library, no external requests. Only the template's font stacks;
  never load web fonts.
- **Tokens, not hex.** Use the template's custom properties (`--background`, `--card`,
  `--foreground`, `--muted`, `--border`, `--clay`, `--ok`, `--warn`, `--bad`, ...), in SVG
  too (classes or `var()`). Dark mode comes from the same tokens.
- **Type.** Serif for titles and section heads, sans for body and controls, mono for code,
  IDs, paths, numbers in tables and small uppercase labels. Body 15px at 1.6; prose capped
  near 720px even inside wide layouts; wide (1080px+) only for boards, diffs, diagrams and
  side-panel tools.
- **Hierarchy over decoration.** Numbered sections, one accent (clay) for "look here", `--ok`
  for done or good, `--bad` for failure or deletion; thin borders, 12px panel radius, no
  gradients, shadows, rotations, hover lifts or stock illustration. Color carries meaning
  and is always paired with a text label.
- **Navigable.** More than three sections gets anchor chips; long documents get a sticky
  side TOC or panel when there is room. Trusted or long detail (full diffs, logs, mechanical
  steps, appendices) goes in `<details>`, closed by default; the important ones open.
- **Accessible and responsive.** Semantic elements, visible focus, 4.5:1 contrast, keyboard
  path for every control (drag-and-drop and hover included), usable at phone width,
  print-safe.
- **Honest.** Separate evidence from assumption. Diagrams show the real mechanism of the
  actual code or system, never a generic box-and-arrow sketch.
- **Small.** Aim for a few hundred lines. Cut anything that does not help ADMIN decide or act.

## Interaction rules

- Interactivity must change ADMIN's understanding or produce output. Motion only for real
  state changes or when judging motion is the job; honor `prefers-reduced-motion`.
- Editors follow state → render → export: clone the initial data, re-render on change,
  export only what changed, Reset restores. Disable Copy while there is nothing to send.
- Persist nothing by default. If state matters across visits, use `localStorage` inside
  try/catch and still render correctly without it.
- Prefer native controls (`details`, `input[type=range]`, checkbox, radio, `button`) styled
  over custom widgets. Clipboard needs the textarea fallback for `file://`.
- Editors are throwaway: build exactly the tool this task needs, with export, nothing else.

## Finish

Open the file in system's default browser; check light and dark mode, a narrow width, keyboard use
of every control, that each Copy produces sensible text, and that the console is clean
before telling ADMIN it is ready. State what the file contains in one or two sentences
with its path; do not repeat its content in chat.
