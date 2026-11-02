# Keep specifications true

A project's specifications describe how the system behaves today: root documents
directly under `docs/` (`README.html`, `architecture.html`, `domain.html`,
`data-model.html`, `quality.html`, `operations.html`), area rules and contracts in
`docs/areas/<area>.html`, and actor flows in `docs/workflows/<flow>.html`. Factory
reads them before a change and updates them after it is verified. It does not
document a whole project; when specs are missing, cover only what the task touches.

## Before intent, design and plan

Read `docs/README.html`, the relevant root documents, areas and workflows. Follow
their code and schema anchors and reconcile them with the actual revision. Existing
legacy specs (`docs/*.md`, `docs/areas/*.md`, `docs/specs/*.spec.md`) remain binding
in place.

Ask the impact question:

> Which actors, area rules, state owners, interfaces, workflow outcomes and runtime
> variants does this change affect? Which existing requirements must remain true?
> Trace callers, writers and asynchronous consumers beyond the edited files. Which
> root documents summarize those facts? Which earlier task decisions explain
> constraints to preserve? Which missing spec content must be discovered before the
> intent can be precise?

Reference preserved requirements with document-qualified IDs
(`areas/identity.html#AUTH-003`) in the intent and plan instead of redefining them.
Keep proposed behavior in the intent and design; never present it as implemented in
current-system documents.

## After Test

When the gates pass, inspect the implementation and evidence, then update the
affected documents:

> What observable behavior now differs? Which rules, contracts, relationships,
> workflow branches, operational steps and quality claims need revision? What
> evidence supports the new wording? Have unchanged paths lost compliance? Does a
> contradiction need repair or the user's authorization to amend a requirement?

- Update canonical facts in one owning document and link from others; do not
  duplicate rules.
- Keep existing IDs and meanings unless the user authorized a change; record that
  authorization in the intent's amendment entry and the test report. Add new IDs
  rather than renumbering.
- Link consequential decisions to the task plan or debrief from the relevant area or
  architecture document.
- Search for changed names, old values and equivalents (a schedule may appear as
  `daily`, `24 hours` or a cron expression). Inspect each match; historical task
  records keep their original context.
- Do not scaffold unrelated documents for a scoped change.

New spec documents are HTML from the [area template](../templates/AREA_TEMPLATE.html)
or the [workflow template](../templates/WORKFLOW_TEMPLATE.html). Edit legacy Markdown
specs in place and format; do not move them or create a competing canonical rule.

## Conflicts

Never remove, weaken or reinterpret an accepted requirement without the user's
explicit authorization. When code and spec disagree, separate an outdated
description (fix it with evidence) from a requirement the code violates (restore
compliance or ask the user for an amendment). Mark coverage gaps instead of treating
missing tests as failure. An unresolved or unverified mismatch leaves the task
incomplete.
