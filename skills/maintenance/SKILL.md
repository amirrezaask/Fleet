---
name: maintenance
description: Run looped review-and-fix subagents over a codebase, one per area, each working in rounds until two rounds in a row find nothing. Use when the user asks for maintenance, a pre-launch hardening pass, a review-and-fix loop, or a refactor and simplification loop over areas of an app.
---

# Maintenance: looped review-and-fix agents

You are the coordinator. Subagents review and fix; you brief them, review and commit
each round, route cross-area findings, and run the final verification. Do not ask the
user questions mid-run: make reasonable calls and say what you decided.

## 1. Set up

1. Work in the session's worktree; every area agent shares it under the file ownership
   below.
2. Pick the areas. Use the ones the user names. Otherwise take them from the project's
   `docs/areas/`, ranked by where data loss and stuck states hurt most. For a web app
   with no area documents, default to four:
   - **SEO**: meta and OG tags, structured data, sitemap and robots, crawlability,
     status codes, share previews.
   - **Performance and robustness**: app shell, routing, bundles, caching headers,
     error, empty and loading states, timeouts, server robustness, accessibility blockers.
   - **The core flow**: the path where losing data or getting stuck costs the user most.
   - **Code quality**: audit, then refactor ([section 2a](#2a-the-code-quality-agent)).
3. Read the repo layout just enough to assign **file ownership** per area. List the
   shared files (server entry, app root, `index.html`, build config) that need careful
   editing.
4. Check for other sessions editing the same checkout (the host's session list;
   uncommitted files nobody in this session touched). Name their files as off-limits in
   every brief.
5. Create one ledger per area in `.work/`: `ledger-<area>.md`.

## 2. Launch: one background agent per area

Start all concurrent areas in one message, as fresh background subagents. Use a cheaper
model than your own for area agents when the host lets you choose (Claude Code:
`sonnet`). Code quality starts later by default. Every brief contains:

- **Product context**: one or two sentences.
- **Area scope**: what to look for, ranked by real user impact (data loss and stuck
  states first), and the files the agent owns.
- **Round protocol**: read the ledger first, find the top issues *not already in it* (up
  to 20, never pad), fix them, verify, append to the ledger (id, impact, fixed or left
  with the reason, `file:line`), and end with a round report.
- **Stop signal**: a round that finds no real user-affecting issue starts its report with
  `NO ISSUES FOUND`.
- **Concurrency**: the other agents' areas and the off-limits files. In shared files make
  small targeted edits, reread right before editing, never reformat whole files and never
  revert changes you did not make.
- **Safety**: never `git checkout`, `stash`, `reset` or `commit`. Do not kill servers or
  browsers you did not start. Use your own port and stop what you start.
- **Repo rules**: the project's `AGENTS.md`/`CLAUDE.md` and process skills, passed on
  verbatim.
- **Verification**: the type check and the fast tests covering what it touched. It runs
  no build, browser or end-to-end suite; a fix that needs one is marked `unverified:
  needs <check>` in the ledger for the final pass.
- **Report format**: issues ranked by impact, the fix for each (`file:line`), what was
  left and why, checks run with results, and a `curl` example for any new or changed
  endpoint.

## 2a. The code-quality agent

**Goal:** simpler code with the fewest abstractions that do the job, with behavior
unchanged. It looks for:

- **Over-engineering:** speculative abstractions, single-use wrappers, factories and
  hooks, needless indirection, configuration for things that never vary, dead code,
  unused exports and files, duplicate helpers.
- **React components:** one responsibility each; props over context unless state is
  truly shared; composition instead of boolean-prop explosions; derived state instead of
  state synced through effects; effects only for real external synchronization;
  colocated state, stable keys, no needless memoization.
- **General practice:** clear names, small functions, early returns, typed errors with
  no swallowed failures, no `any` leaks, imports going one direction.

It follows `codebase-design`, `react-patterns` and `simplify` where available, and the
repo's own standards and lint configuration. On top of the common brief:

- **Behavior-preserving only.** Run the tests that cover a file before and after each
  refactor. Where coverage is thin, add a characterization test first or leave the code
  alone. Bug fixes go to the owning area's agent.
- **Rank by payoff:** the largest reduction in complexity per line touched first. Report
  lines removed and added each round.
- **No churn:** no renames or moves for taste, no mass reformatting. Public and HTTP API
  shapes, save formats, wire protocols and storage keys stay unchanged.
- **One refactor per logical change**, so each can be reviewed and reverted alone.

A cheaper read-only agent (Claude Code: `haiku`) may first list candidates (`file:line`,
smell, proposed simplification) for the refactoring agent; it never edits.

**Scheduling.** Refactors collide with the other agents' edits. Run this agent after the
other areas have stopped (the default), or concurrently only in files no other agent
owns. It uses the same round protocol, ledger and stop rule.

## 3. Run the loop

When an agent reports:

1. **Review the round yourself.** Read the diff of risky changes, not just the report;
   the [change-review](../change-review/SKILL.md) code and security lenses say what to
   look for. Catches from past runs on web apps:
   - A redirect on a path the service worker precaches, which caches the redirected
     response and breaks offline launch.
   - A client timeout on a money mutation (pay, subscribe), which risks a double charge.
   - Auto-reload on chunk errors during an active session, which loses progress.
   - A weaker crypto cost keyed on `NODE_ENV` instead of an explicit test-only flag.
   - Link blocks hidden for crawlers (cloaking risk).
   - `String.replace` with a string replacement on user or catalog data (`$&` injection).
   - WebP `og:image`s, which some messengers do not render.
2. **Fix small, clear problems yourself** when the agent has moved on; otherwise send
   them back as the first item of the next round.
3. **Route cross-area findings** to the owning agent. Attribute a failure before anyone
   "fixes" a test: a stale assertion, another agent's change, another session, or
   already failing at `HEAD`? See [debugging](../debugging/SKILL.md).
4. **Commit the reviewed round**: only that area's files
   (`git add -- <paths> && git commit`), with a message naming the area and round. Agents
   never commit. Push or merge only when the user asks.
5. **Track dry rounds per area.** A round is dry when it found no new real issue; fixes
   you assigned do not count as found. Any real finding resets the count to 0. **Two dry
   rounds in a row end that agent's loop.**
6. **Start the next round** by continuing the same agent (Claude Code: `SendMessage`):
   the round number, the dry count, your corrections first, then parts of the area it has
   not covered. Later rounds include a self-review of the agent's whole diff.
7. **Give the user a short status**: what changed in plain terms, what you corrected, and
   a table of Area / Round / Fixes so far / Dry rounds in a row.

### Interruptions

- **Usage limit:** once it resets, tell each agent to continue where it stopped and to
  reread files first.
- **Agents were stopped and the user wants a restart:** stopped agents cannot resume.
  Start fresh ones with the same brief plus the ledger path, the round number, the dry
  count and "the working tree is the current state".
- **"Stop all":** stop every agent and wait for the user's next instruction.

## 4. Finish

When every area has stopped:

1. Make sure nothing else loads the machine (no agent builds or servers); test flakes
   from load are common during the loop.
2. Run on the combined tree, cheapest first: the type check, unit tests, the build and
   its budgets, then the browser and end-to-end suites, and each `unverified` ledger
   entry. Use [resource-bounded runs](../resource-bounded-runs/SKILL.md) for large ones.
3. Triage every failure by owner as in step 3.3, fix what belongs to this run, and
   commit.
4. Report per area: the number of fixes and the important ones, what was left for the
   user to decide, what was never verified (real devices, other browsers), and the
   remaining test state. Delete the ledgers.
