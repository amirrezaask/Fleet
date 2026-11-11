---
name: maintenance
description: Run looped review-and-fix subagents over a codebase, one per area (default SEO, web app performance/robustness, the core product flow such as player/downloads/saves, and code quality/simplification). Each agent works in rounds, finding and fixing the next batch of real issues, until two consecutive rounds find nothing. Use when the user asks for "maintenance", a pre-launch hardening pass, "review and fix in a loop", a refactor/simplification loop, or looped subagents on areas of the app.
---

# Maintenance: looped review-and-fix agents

You are the coordinator. Subagents do the reviewing and fixing; you brief them, review each round's diff, route cross-area findings, and run the final combined verification. Don't ask the user questions mid-run. Make reasonable calls and say what you decided.

## 1. Set up

1. Pick the areas. Use the ones the user names. Otherwise default to four:
   - **SEO**: meta and OG tags, structured data, sitemap and robots, crawlability, status codes, share previews.
   - **Web app performance and robustness**: app shell, routing, bundles, caching headers, error, empty and loading states, timeouts, server robustness, accessibility blockers.
   - **The product's core flow**: for GameBox this is the player, downloader/installer and saves. Elsewhere, pick the flow where data loss or stuck states hurt most.
   - **Code quality**: audit, then refactor. See section 2a for its brief and scheduling.
2. Look at the repo layout just enough to assign **file ownership** per area (which directories and files each agent owns). List shared files (server entry, App root, index.html, build config) that need careful editing.
3. Check for other sessions editing the same checkout (`ListAgents`; uncommitted files nobody in this session touched). Name their files as off-limits in every brief.
4. Create one ledger per area in the scratchpad: `ledger-<area>.md`.

## 2. Launch: one background agent per area

- **Always `model: "sonnet"`** (the user's standing preference). The one exception is a read-only Haiku audit pass for code quality (see 2a). Use `subagent_type: general-purpose` and `run_in_background: true`. Launch all concurrent areas in one message. Code quality goes later by default.
- Every brief must contain:
  - **Product context**: one or two sentences.
  - **Area scope**: what to look for, ranked by real user impact (data loss and stuck states first), plus the files the agent owns.
  - **Round protocol**: each round, read the ledger first, then find the top issues *not already in the ledger* (aim for up to 20, never pad), fix them, verify, append to the ledger (id, impact, fixed or left plus the reason, file:line), and end with a round report.
  - **Stop signal**: if a round finds no real user-affecting issue, the report starts with `NO ISSUES FOUND`.
  - **Concurrency rules**: name the other agents' areas and the off-limits files. For shared files, make small targeted edits, re-read right before editing, never reformat whole files, and never revert changes you didn't make.
  - **Safety**: never git checkout/stash/reset/commit. Don't kill servers or browsers you didn't start. Use your own port and stop what you start.
  - **Repo rules**: load the repo's process skills (e.g. `charter`, `testing`) and AGENTS.md / CLAUDE.md rules, and pass them on verbatim (e.g. GameBox requires muted game tabs).
  - **Verification**: typecheck, the relevant tests, a build/budget check where relevant, and real-browser checks for UI changes.
  - **Report format**: issues ranked by impact, the fix for each (file:line), what was left and why, checks run with results, and curl examples for any new or changed endpoint.

## 2a. The code-quality agent

**Goal:** simpler code with the fewest abstractions that do the job, while behaviour stays the same.

**What it looks for:**
- **Over-engineering to remove:** speculative abstractions, single-use wrappers/factories/hooks, needless indirection layers, config for things that never vary, dead code, unused exports and files, duplicate helpers.
- **React components:** clean, standard boundaries.
  - One clear responsibility per component.
  - Props over context unless state is truly shared.
  - No god components; split by responsibility, not by line count.
  - No boolean-prop explosions; prefer composition.
  - Derive state instead of syncing it through effects.
  - Effects only for real external synchronization.
  - Colocated state, stable keys, and no needless memoization.
- **General practice:**
  - Clear naming and small functions.
  - Early returns over nesting.
  - Typed errors, no swallowed failures.
  - No `any` leaks.
  - Consistent module boundaries, with imports going one direction.
- Load and follow `codebase-design`, `react-patterns` and `simplify` where available, plus the repo's own coding standards (CLAUDE.md, AGENTS.md, lint config). Match the surrounding code's idiom.

**Rules on top of the common brief:**
- **Behaviour-preserving only.** Run the tests that cover a file before and after each refactor. If coverage is thin, add a characterization test first, or leave the code alone. Bug fixes go to the owning area's agent, not into a refactor.
- **Rank by payoff:** the largest reduction in complexity per line touched first. Report lines removed vs added for each round.
- **No churn:** no renames or moves just for taste, no mass reformatting, and public or HTTP API shapes stay unchanged. Save formats, wire protocols and storage keys are never touched.
- **One refactor per logical change**, so each one can be reviewed and reverted on its own.

**Models:**
- Refactoring rounds use Sonnet.
- A Haiku agent may do a read-only audit pass that lists candidates (file:line, smell, proposed simplification) for the Sonnet refactorer. That is cheaper on large repos. Haiku never edits.

**Scheduling:** refactors collide with the behaviour agents' edits. So either:
- (a) run it **after** the other areas have stopped (the default), or
- (b) run it concurrently, but only on files no other agent owns. It moves into their files once those agents stop.

Same round protocol, ledger (`ledger-quality.md`) and two-dry-rounds stop rule as the other areas.

## 3. Run the loop

When an agent reports:

1. **Review the round yourself** before continuing. Read the diff of risky changes, not just the report. Typical catches from past runs:
   - A redirect on a path the service worker precaches (it caches the redirected response and breaks offline launch).
   - A client timeout on money mutations (pay or subscribe), which risks a double charge.
   - Auto-reload on chunk errors during an active game or session, which loses progress.
   - A weaker crypto cost keyed on `NODE_ENV`; it must be an explicit test-only flag instead.
   - Hidden link blocks for crawlers (cloaking risk).
   - `String.replace` with a string replacement on catalog or user data (`$&` injection).
   - WebP og:images (some messengers don't render them).
2. **Fix small, clear problems yourself** if the agent has moved on. Otherwise send them back as the first item of the next round.
3. **Route cross-area findings** to the owning agent (e.g. a failing test caused by another area's change). Attribute failures before anyone "fixes" a test: is it a stale assertion, another agent's change, another session, or pre-existing at HEAD?
4. **Track dry rounds per area.**
   - A round counts as dry if it found no new real issue. Fixes you assigned don't count as found.
   - Any real finding resets the counter to 0.
   - **Two consecutive dry rounds end that agent's loop.**
5. **Start the next round** with `SendMessage` to the same agent: the round number, the dry count so far, your corrections first, then fresh areas the agent hasn't covered (from its own "unread" list or your ideas). Later rounds should include a self-review of the agent's own whole diff for regressions.
6. **Give the user a short status** after each report: what changed in plain terms, what you corrected, and a table of Area / Round / Fixes so far / Dry rounds in a row. Nothing is committed.

### Interruptions

- **Usage limit**: once it resets, `SendMessage` each agent to continue where it stopped and re-read files first.
- **User stops agents and wants a restart**: stopped agents can't be resumed. Launch fresh Sonnet agents with the same brief, plus the ledger path, the current round number and dry count, and "the uncommitted working tree is the current state".
- **"stop all"**: stop every agent with `TaskStop`. Don't assume the next step; if the user's next word is ambiguous, ask once.

## 4. Finish

When every area has stopped:

1. Make sure nothing else is loading the machine (no agent builds or servers). Load-induced test flakes are common during the loop.
2. Run on the combined tree:
   - the typecheck
   - the unit tests
   - the build and budgets
   - the spec/e2e suites
3. Triage every failure by owner, as in step 3.3, and fix what belongs to this run.
4. Report per area: the fixes (count and the important ones), what was left for the user to decide, what was never verified (e.g. real iOS devices, Safari/Firefox), and the remaining test state. Commit only if the user asks.
