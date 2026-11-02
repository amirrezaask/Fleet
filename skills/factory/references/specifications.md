# Integrate Atlas specifications

Atlas owns specification discovery, document responsibilities and templates.
Use its [maintenance guide](../../atlas/references/maintenance.md) for the
change-driven cycle. Factory owns delivery and its completion gate. Only ADMIN's
explicit `/atlas` command initiates a full existing-project baseline; these
maintenance instructions do not implicitly invoke initialization.

Before writing an intent, design or plan, read relevant system documents, area rules and
actor workflows, then inspect their implementation. Use targeted discovery
prompts linked by the maintenance guide when affected documentation has gaps.
Reference preserved rules with document-qualified IDs instead of redefining them.

In the Test stage, after the gates pass, update affected specs from verified behavior. Root documents live directly under
`docs/`; area rules/contracts live in `docs/areas/`, actor flows in
`docs/workflows/`. Link consequential choices to task plans/debriefs. Do not
scaffold unrelated documents for a scoped change.

Never remove, weaken or reinterpret an accepted requirement without ADMIN's
explicit authorization. If code and spec disagree, investigate and restore
compliance or request an authorized amendment. Record the reason in the task's
intent amendment entry and the test report; Git retains earlier text. Unresolved or unverified
accepted-rule mismatches leave the delivery task incomplete.

New and newly documented specifications are HTML files built from Atlas's
templates (`docs/architecture.html`, `docs/areas/<area>.html`, ...). Historical
Markdown specs (`docs/*.md`, `docs/areas/*.md`, `docs/specs/*.spec.md`) remain
binding in their existing location and format unless ADMIN requests migration;
edit them in place when a verified change touches them. Do not silently move them
or create a competing canonical rule. Link existing documents while using Atlas's
structure for newly documented areas.
