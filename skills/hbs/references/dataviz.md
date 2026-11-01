# HBS data visualization and diagrams

Small, hand-built visuals that live inside a document. No chart library, no external
requests: CSS for bars and timelines, inline SVG for anything with geometry. Every
snippet uses the [base template](../templates/BASE_TEMPLATE.html) tokens so light and
dark mode both work.

## Pick the visual by intent

Decide what ADMIN must *see* before drawing anything. Name the relationship in the
data or the idea (one number, a change, a ranking, a flow...), then take the format from
this table. If no row fits, a sentence or a table is probably the right answer; do not
draw a chart to decorate prose.

### Data you want to show

| Intent: ADMIN should see... | Use | Avoid |
| --- | --- | --- |
| One headline number and whether it is good | KPI / stat tile with colored delta and "lower is better" | A chart with one bar; a gauge |
| A few headline numbers at once | Stat band (4 tiles, anomaly tile marked) | A paragraph of numbers |
| A change between two states | Before/after pair ending on the same metric | Two separate charts |
| Values compared across categories | Single-accent bar chart, sorted, labels on bars | Pie, 3D, unsorted bars |
| Part of a whole, or completion | Progress bar with % label; stacked bar for 2-4 parts | Pie or donut beyond 3 slices |
| A trend over time | Sparkline (inline) or line chart with an end label | Bars for long series; dual axes |
| Where an outlier is | Same chart, only the outlier in clay, caption explains it | Coloring every series |
| Distribution or spread | Small histogram from CSS bars; min/median/max row | Mean alone |
| Two variables against each other | Scatter in SVG with labelled points | Two side-by-side bar charts |
| Many items × many attributes | Table with tinted cells (`good`/`bad`), sortable if long | A chart per attribute |
| Exact values ADMIN will look up | Plain table, right-aligned mono numbers | Any chart |
| Severity or risk across items | Risk map chips + severity table with one 3-level scale | Color without labels |

### Knowledge you want to communicate

| Intent: ADMIN should understand... | Use | Avoid |
| --- | --- | --- |
| What happens in order (process, request path) | Flowchart / numbered steps linked to a diagram, click-to-inspect | Prose list of 12 steps |
| Branching and failure paths | Flowchart with decision diamonds and dashed failure edges | Nested bullets |
| How parts depend on each other | Module map: boxes and arrows from real imports, hot path in clay | Generic architecture boxes |
| Sync vs async, who talks to whom | Data-flow diagram with line-style encoding stated in caption | Unlabelled arrows |
| What happened when (incident, run log) | Event timeline with state-colored dots | A table of timestamps |
| What will happen when (plan, rollout) | Milestone timeline; rollout strip with guardrails | Gantt with fake precision |
| Choices and their trade-offs | Equal option cards with same-key chips + recommendation on top | Sequential walls of text |
| Where options sit on one axis (cost, ambition) | Spectrum strip with dots linked to cards | 2x2 with one meaningless axis |
| What changed in code | Annotated diff with risk map and anchored comments | Raw diff dump |
| What stayed the same vs changed vs dropped | Three-column preserved / changed / dropped + edge-case match table | One merged list |
| A visual or motion difference | Live render: variant sheet, split slider, animation sandbox | Describing it in words |
| An unfamiliar concept | Live model ADMIN can poke + comparison table + linked glossary | Definitions only |
| A domain's vocabulary | Term ladder (term, meaning, "say →" example sentence) | Glossary without usage |
| Hidden risks in unfamiliar territory | Asked-vs-actual grid + typed blindspot cards | Generic warnings |
| Whether ADMIN understood | Scenario quiz linked back to sections | "Any questions?" |

Then: one visual per point, the takeaway in its caption, and the visual placed right
after the sentence that claims what it shows.

## Rules for every visual

- **One point per visual.** Color only the thing ADMIN should look at (the peak bar,
  the hot node, the failing edge); everything else stays neutral (`--muted`, `--border`).
- **Label the data, not just the axes.** Value on or beside each mark; a one-line
  caption that says what to notice ("Spike is the batch import on Tuesday").
- **State the encoding.** If line style or color means something, say it in the caption
  or a chip legend: "Solid = request path. Dashed clay = async fan-out."
- **Say which way is good.** Deltas are colored by meaning, not sign: a drop in latency
  is `--ok`. Write "lower is better" when it is not obvious.
- **State simplifications.** "Retries with jitter not pictured."
- **Generate coordinates from data.** Write a tiny JS loop over an array rather than
  hand-placing dozens of `<rect>`s; hand-computed coordinates drift from the numbers.
- **Theme the SVG with classes or `var(--token)`, never hex.** The exception is an SVG
  meant to be downloaded standalone: give it its own `<defs><style>` and background rect.
- **Accessible.** `role="img"` and an `aria-label` that states the takeaway; color always
  paired with a text label; no emoji inside diagrams.
- **Fit the width.** `width="100%"` with a `viewBox`; for wide diagrams wrap in
  `overflow-x:auto` with a `min-width` so they never squash into illegibility.

## Numbers

**Stat band** (above the fold of reports and plans). Four tiles, two on phones. Serif
number, small uppercase label, mono delta. Mark the anomaly tile with a clay left border.

```html
<div class="stats">
  <div class="stat"><b>38%</b><span>p95 drop</span><em class="good">↓ from 410ms</em></div>
  <div class="stat alert"><b>3</b><span>slipped</span><em>2 blocked on review</em></div>
</div>
```

**KPI with delta**: big number, smaller unit span, delta line `↓ 12% wk/wk` colored by
meaning. **Before/after pair**: two panels that end on the *same* metric
(p99 1.4 s → 180 ms), the after panel carries the `--ok` border.

## Bars and progress (CSS only)

```html
<div class="bar"><i style="width:70%"></i></div><span class="mono">~70%</span>
```

`.bar{height:6px;background:var(--muted);border-radius:99px} .bar i{display:block;height:100%;background:var(--clay);border-radius:inherit}`.
Use for milestone progress, budget burn, coverage. A row of literal-width bars
(`style="width:24px"`) with `align-items:flex-end` makes a spacing ruler or a tiny
histogram.

**Single-accent bar chart (SVG from data)**:

```js
const data=[["Mon",42],["Tue",120],["Wed",55]], max=Math.max(...data.map(d=>d[1]));
svg.innerHTML=data.map(([k,v],i)=>{const h=v/max*120,x=40+i*70;
  return `<rect class="${v===max?'peak':'bar'}" x="${x}" y="${140-h}" width="48" height="${h}" rx="6"/>
  <text x="${x+24}" y="${134-h}" text-anchor="middle">${v}</text><text x="${x+24}" y="158" text-anchor="middle">${k}</text>`}).join("");
```

Neutral bars `fill:var(--border)`, peak `fill:var(--clay)` with a bold label, one baseline,
faint gridlines at most.

**Sparkline**: `<svg viewBox="0 0 300 48" preserveAspectRatio="none" width="100%">` with a
`<polyline fill="none" stroke-width="2" vector-effect="non-scaling-stroke">`, a baseline
and a caption. Put the end dot in HTML or a non-stretched SVG so it stays round.

## Time

**Event timeline** (incidents, logs, implementation notes): a pseudo-element rail with
state-colored dots ringed in the page background so they cut the line.

```html
<ol class="tl"><!-- styles in the base template -->
  <li class="bad"><time>14:02</time><strong>Impact starts.</strong> Error rate 12%.</li>
  <li class="ok"><time>14:31</time><strong>Mitigated.</strong> Flag off, errors back to baseline.</li>
</ol>
```

Mono time chip first, then a bold event type ("**Impact starts.**", "**Mitigated.**"),
then one sentence. Admit wrong turns and their cost ("cost roughly 13 minutes").

**Milestone timeline** (plans): grid `120px 28px 1fr` = when | dot column | body. The dot
column is a flex column with the dot and a `flex:1` connector hidden on `:last-child`.
Done = filled `--ok`, pending = ring in `--clay`. Each milestone lists the paths it touches.

**Keyframe or schedule track**: a thin track with absolutely placed markers
(`left:20%;transform:translateX(-50%)`), label above, value below in mono. Also works for
"time in queue" strips.

**Rollout strip**: joined cells (outer radius only), each with a day label, a big mono
value (internal / 10% / 100%) and its guardrail ("Alert if dead-letter > 0.5%").

## Option space

**Spectrum strip**: a horizontal line from cheap to ambitious with numbered dots at
`left:%`, end labels ("Ship this afternoon" / "Quarter-long bet") and tick categories.
Clicking a dot scrolls its card into view; checking a card lights its dot. Use instead of
an effort/impact 2x2 when one axis matters.

**Effort pills**: S / M / L / XL with escalating tint, the same scale on every card.

**Same-key metric chips**: every option card ends with identical keys
(`Bundle: <b>+0.2kb</b> · Testability · SSR safe`) so values compare across a row.

**Pro/con grid**: two columns with colored `::before` dots (ok = pro, clay = con)
instead of ✓/✗ glyphs.

## Structure and flow (SVG)

- **Nodes**: `<g class="node gate|ok|bad" data-k="build">` styled by CSS. Rect with
  `rx=8` for steps, `rx=22` for terminals, diamond `<path>` for decisions. Two-line
  labels: mono name, then a 10px muted subline with file path or timing ("~6 min · 3 shards").
- **Edges**: `.edge{stroke:var(--muted-foreground);stroke-width:1.5;fill:none}`; failure
  edges `stroke:var(--clay);stroke-dasharray:4 4`; success edges `--ok`. One marker per
  color, `orient="auto-start-reverse"`. Tiny edge labels ("pass", "fail → rollback").
- **Async and loops**: dashed quadratic curves (`d="M100 180 Q135 130 170 180"`) with the
  wait labelled at the control point ("+1s").
- **Hot path**: the same `.hot` clay state on the SVG node and on the matching numbered
  step badge in the prose, so diagram and text point at each other.
- **Inverted store**: persistence or external system drawn with `--foreground` fill so it
  reads as a different kind of thing.
- `svg text{pointer-events:none}` so clicks reach the node.

**Before/after flow pair** (no SVG needed): two cards of stacked boxes with `↓` rows
labelled by latency or protocol; new components in clay; a `display:grid` row for fan-out.

**Polar or ring diagrams**: compute points from data.

```js
const pt=(r,t)=>[CX+r*Math.sin(t*2*Math.PI),CY-r*Math.cos(t*2*Math.PI)];
const arc=(t0,t1)=>{const[a,b]=pt(R,t0),[c,d]=pt(R,t1);let s=t1-t0;if(s<=0)s+=1;return `M${a} ${b}A${R} ${R} 0 ${s>.5?1:0} 1 ${c} ${d}`};
```

Use a deterministic hash for demo data so the picture is stable across reloads.

## Review visuals

- **Risk map chips**: anchor chips per file with a severity dot and tint, plus a legend
  row (safe / worth a look / needs attention). One three-level scale reused for chips,
  tags, comment borders and table cells.
- **Diff rows**: `display:grid;grid-template-columns:48px 18px 1fr;white-space:pre`,
  `--ok-tint` adds, `--bad-tint` deletes, a hunk header row, `user-select:none` on line numbers.
- **Comment bubble**: 4px left border by severity, "line 11" anchor, uppercase
  BLOCKING / NIT / QUESTION label, then the failure mechanism.
- **Severity table**: grid `1.6fr 90px 1.6fr` (risk | sev | mitigation) that stacks under
  780px. Severity chips are tint background plus dark text, never color alone.
- **Edge-case match table**: case | old behavior | new behavior | `identical` or
  `equivalent*`, with a footnote defining "equivalent".
- **Linked highlights**: `<mark data-p="2">` in two code columns and a numbered margin
  note; hover any one and all with the same key light up.

## Visual comparison

- **Before/after split slider**: two stacked layers, the top one clipped with
  `clip-path:inset(0 0 0 X%)`, driven by a transparent full-size `<input type=range>` on
  top (`position:absolute;inset:0;opacity:0;cursor:ew-resize`).
- **Scoped theme tokens**: `.stage{--fg:…;--line:…}` / `.stage.dark{…}` previews light
  and dark side by side with one class flip.
- **Variant sheet**: one shared dataset in every variant so the design is the only
  variable; letter labels ("A · Flat") and a `best for:` line under each.
