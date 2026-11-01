---
name: hbs
description: HTML-based communication. Use whenever an agent creates an HTML document to communicate with ADMIN, such as an explainer, comparison, plan, review, report, diagram, prototype or custom editor. Picks the right format and applies the Claude-style tokens.
---

# HBS: HTML-based communication

Address the user as ADMIN. All agent artifacts are HTML (see `AGENTS.md`). This skill
decides **what shape** an HTML document should take so ADMIN grasps it fast and can
act on it. Factory's structured documents (brief, plan, task, debrief) keep their
own templates; use this skill for everything else ADMIN reads, compares, or edits.
Source of the ideas: [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/).

## When HTML earns its place

Use HTML when the content is **spatial, visual, comparative or interactive**: options
side by side, diagrams, diffs, timelines, state, sliders, drag-and-drop, anything
ADMIN must react to rather than just read. Plain chat text is still right for a short
answer, a yes/no, or a single fact. When in doubt, ask whether ADMIN would learn
more by seeing or by reading. Never write Markdown artifacts.

## Workflow

1. **Name the job.** What should ADMIN be able to do after opening this: decide,
   review, understand, tune, or hand off? Pick the format in
   [the format catalog](references/formats.md).
2. **Start from the shell.** Copy [the base template](templates/BASE_TEMPLATE.html).
   It carries the Claude tokens, light/dark mode and shared components. Delete what
   you do not use; add components only when the job needs them.
3. **Lead with the answer.** Put the conclusion, recommendation or decision needed in
   the first screen, then the evidence. A reader who stops after one screen should
   still have what they need.
4. **Fan out, then converge.** For open questions, render several options side by
   side with trade-offs inline, then say which you recommend and why.
5. **Close the loop.** Anything ADMIN can change in the page (toggles, ordering,
   sliders, choices) ends with a visible **Copy as text** control that turns the
   state back into a prompt, command, diff or config ADMIN can paste to you.
6. **Save and point.** Write the file to the path the project's rules specify
   (`docs/reports/` for results, `.work/` for scratch) and give ADMIN the full path.
   Use an Artifact or SendUserFile when ADMIN is away from the machine.

## Design rules (Claude style)

- **One self-contained file.** Inline CSS and JS, inline SVG for drawings. No build
  step, no framework, no external requests. Only the system and Anthropic font stacks
  from the template; never load web fonts.
- **Tokens, not hex.** Use the template's custom properties (`--background`, `--card`,
  `--foreground`, `--muted`, `--border`, `--clay`, ...). Dark mode comes from the same
  tokens via `prefers-color-scheme`; never hardcode a color in a component.
- **Type.** Serif for titles and section heads, sans for body and controls, mono for
  code, IDs and paths. Body 15px at 1.6; max reading width about 760px, wider only for
  boards, diffs and diagrams.
- **Hierarchy over decoration.** Numbered sections, one accent (clay), generous spacing,
  thin borders, no gradients or stock illustration. Color carries meaning (severity,
  status, add/remove), always paired with a text label or icon.
- **Navigable.** More than three sections gets anchor chips at the top. Long detail
  (full diffs, logs, appendices) goes in `<details>` closed by default.
- **Accessible and responsive.** Semantic elements, visible focus, 4.5:1 text contrast,
  keyboard operation for every control, usable at phone width, print-safe.
- **Honest.** Separate evidence from assumption. Mark unverified claims. Diagrams show
  the real mechanism of the actual code or system, not a generic box-and-arrow sketch.
- **Small.** Aim for a few hundred lines. Cut anything that does not help ADMIN decide
  or act.

## Interaction rules

- Interactivity must change ADMIN's understanding or produce output. No decorative
  animation; honor `prefers-reduced-motion`.
- Persist nothing by default. If state matters across visits, use `localStorage` inside
  try/catch and still render correctly without it.
- Prefer native controls (`details`, `input[type=range]`, `button`) over custom widgets.
- Editors are throwaway: build exactly the tool this task needs, with export, and
  nothing else.

## Finish

Open the file in the browser pane, check light and dark mode and a narrow width, and
check the console is clean before telling ADMIN it is ready. State what the file
contains in one or two sentences with its path; do not repeat its content in chat.
