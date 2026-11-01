# Document responsibilities and templates

A full baseline uses the following structure directly under `docs/`. Scoped work
updates the relevant documents only. Templates are starting points: replace
instructions with supported content, omit irrelevant subsections and state why
a whole root concern does not apply. Do not generate fictional systems to fill
headings. Contracts stay in areas and decision reasoning stays in linked tasks.

| Destination | Owns | Template |
| --- | --- | --- |
| `docs/README.html` | Purpose, actors, scope, navigation, coverage and reading routes | [README](../templates/README_TEMPLATE.html) |
| `docs/architecture.html` | Components, boundaries, communication, deployables and source map | [Architecture](../templates/ARCHITECTURE_TEMPLATE.html) |
| `docs/domain.html` | Shared concepts, canonical terms, relationships and shared business rules | [Domain](../templates/DOMAIN_TEMPLATE.html) |
| `docs/data-model.html` | Entities, identity, relationships, authority, derived copies and lifecycle | [Data model](../templates/DATA_MODEL_TEMPLATE.html) |
| `docs/quality.html` | Accepted quality requirements, evidence and current limitations | [Quality](../templates/QUALITY_TEMPLATE.html) |
| `docs/operations.html` | Runtime/configuration, release, monitoring, backup and recovery | [Operations](../templates/OPERATIONS_TEMPLATE.html) |
| `docs/areas/<name>.html` | Responsibility, standing rules, state ownership and contracts | [Area](../templates/AREA_TEMPLATE.html) |
| `docs/workflows/<name>.html` | Actor goal, trigger, sequence, outcomes and recovery | [Workflow](../templates/WORKFLOW_TEMPLATE.html) |

`docs/tasks/<status>/<task>/` and `docs/reports/` retain Factory's conventions. Atlas does
not scaffold task records during a baseline. Historical docs remain where they
are unless ADMIN requests migration. When migrating, preserve rule IDs and meaning,
repair inbound links, and retire the old canonical text in the same change.

## Keep distinctions useful

- **Domain vs data:** domain explains what a reservation means and its business
  constraints; data model explains its identity, relationships, owner and durable
  representation. Detailed reservation rules live in the inventory area.
- **Area vs workflow:** inventory defines when a reservation is allowed; checkout
  references that rule when reserving stock and explains the next steps and failures.
- **Architecture vs area:** architecture maps responsibility to components and
  deployment; area documents explain behavior independent of incidental file layout.
- **Quality vs operations:** quality defines expected outcomes and evidence;
  operations describes how configuration, execution and recovery work.
- **Current decision vs history:** a spec briefly explains a consequential current
  choice and links the task plan/debrief for alternatives and tradeoffs. Do not
  reconstruct rationale from code or create an ADR directory by default.

## Evidence format

Use concise source notes, for example: `Source-supported at <revision>:
src/inventory/reserve.ts, reserveStock; enforced by the conditional write.` Runtime
notes add command, scenario, environment and result. Use repository-relative
links in the authored documents so they survive a different checkout. A per-file
revision note plus local claim anchors avoids repeating the hash on every line.

Give important claims their supporting source near the rule or in a keyed
evidence table. Keep uncertainty attached to the affected claim. Distinguish
document approval/requirement authority from how strongly evidence supports the
statement. An observed baseline can be accurate without having accepted intent.
