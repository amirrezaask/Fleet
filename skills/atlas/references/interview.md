# Interview pass (optional)

Code shows what the system does; only ADMIN can say what terms and rules are
intended. Run this pass inside an `/atlas` invocation when evidence leaves
consequential vocabulary or intent unresolved, or when ADMIN asks to be
interviewed. Skip it when the code, existing specs and ADMIN's scope already
answer the questions. It never runs outside `/atlas`; Factory clarification keeps
using the [grilling method](../../factory/references/grilling.md) for briefs.

## Method

Use the design-tree and frontier rounds from the grilling method: ask every
currently askable question in one numbered round with a recommended answer, wait,
recompute, repeat until the frontier is empty. Facts come from the repository,
never from ADMIN. Recommendations come from the evidence you gathered, so each
question cites the path or symbol behind it.

Questions worth ADMIN's time:

- A term used for two things, or two terms used for one (for example the same
  entity called `order` in one area and `booking` in another).
- A rule the code enforces in some paths and bypasses in others: intended or bug?
- Behavior that looks accidental: guarantee, tolerated quirk or dead code?
- A legacy, vendor or translated name that readers must map to the canonical term.
- Which area owns a concept that several areas touch.

## Feeding the documents

Write answers into [docs/domain.html](../templates/DOMAIN_TEMPLATE.html) as they are
settled, not at the end:

- Add or correct the term row: meaning, aliases/translations, owning area.
- Record a settled shared rule with a stable anchor, marked **accepted** with
  ADMIN's answer as the authority, and the date. Unanswered or agent-inferred
  items stay **inferred** or **unknown** under "Ambiguities and evidence".
- Rules that belong to one area go to that area's file; link instead of copying.
- A choice with consequential alternatives and reasoning goes to the relevant
  Factory plan or debrief, linked from the specification. No `decisions/`
  directory is created.

Use the vocabulary ADMIN confirms in every later document and question. When an
answer contradicts an accepted requirement, stop and follow Atlas's authorization
rule for amendments rather than rewriting it.

Adapted from the grill-with-docs and domain-modeling skills in mattpocock/skills;
this repository has no dependency on them.
