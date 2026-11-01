# HBS interaction idioms

Plain JS, no framework, each idiom a few lines. Add interaction only when it changes what
ADMIN understands or produces text ADMIN sends back. Every control must work with the
keyboard; nothing may depend on hover alone.

## The loop: state → render → export

Every editor, picker or questionnaire has the same shape:

```js
const INITIAL = [/* data from the repo or task */];
let state = structuredClone(INITIAL);
function render(){ /* rebuild the DOM, counts and warnings from state */ out.textContent = reply(); }
function reply(){ /* plain text ADMIN pastes back: prompt, list, diff, JSON */ }
reset.onclick = () => { state = structuredClone(INITIAL); render(); };
```

- **Export only what matters**: the changed keys as a diff (`- "k": false` / `+ "k": true`),
  the ordering as a list with each group's rationale, the picks as sentences.
- **Show the reply live** in a `<pre>` next to the controls, so ADMIN sees what will be sent.
- **Disable Copy** when there is nothing to send; show "N pending changes" in a sticky panel.

## Copy with feedback and fallback

`navigator.clipboard` fails on `file://` in some browsers; keep the fallback.

```js
function copy(text, btn){
  const fallback = () => { const t=document.createElement("textarea"); t.value=text;
    t.style.cssText="position:fixed;opacity:0"; document.body.append(t); t.select();
    document.execCommand("copy"); t.remove(); };
  const p = navigator.clipboard ? navigator.clipboard.writeText(text).catch(fallback) : Promise.resolve(fallback());
  p.then(() => { const l=btn.textContent; btn.textContent="Copied ✓"; setTimeout(()=>btn.textContent=l,1400); });
}
document.addEventListener("click", e => { const b=e.target.closest("[data-copy-target]");
  if (b) copy(document.getElementById(b.dataset.copyTarget).textContent, b); });
```

Any element can then be copied with `<button data-copy-target="fix-3">Copy</button>`.

## Reply assembly (turning clicks into a prompt)

```js
const lines = [`Go with ${pick ?? "[pick a direction]"}.`];
if (steals.length) lines.push(`Steal: ${steals.join("; ")}.`);
if (skips.length)  lines.push(`Skip: ${skips.join("; ")}.`);
lines.push("Then build it in src/pages/Queue.tsx. Treat 1-4 as fixed; flag conflicts before coding.");
```

- **Self-contained labels**: `data-label="the time-in-queue strip (D3)"` reads correctly
  when pasted without the page.
- **Visible blanks**: unanswered items render as `___ (tap a chip above)` and the reply
  ends with `Other notes: ___`, so a partial answer is obvious.
- **Preselect sensible defaults** so the reply never opens empty.
- **Tag free text**: append `[my own wording, ask if unclear]` to typed answers.
- **End with the next action** and the constraints the agent must respect.
- **Fixed replies** for confirmations: one button copies `semantics confirmed`, another
  copies a correction template with `section/row:` and `correct behavior:` blanks.

## Disclosure and navigation

- **`<details>` with a custom marker**:
  `summary{list-style:none} summary::-webkit-details-marker{display:none} summary::before{content:"▸";transition:transform .12s} details[open]>summary::before{transform:rotate(90deg)}`.
  Put a right-aligned locator in the summary (`.where{margin-left:auto}` holding `file:line`
  or `+12 −3`). Open the important items; collapse the trusted ones.
- **Accordion** where one-at-a-time helps scanning:
  `ds.forEach(d=>d.addEventListener("toggle",()=>d.open&&ds.forEach(o=>o!==d&&(o.open=false))))`.
- **Tabs** (config / call site / response):

```js
document.querySelectorAll("[data-tabs]").forEach(box => {
  const btns=box.querySelectorAll("[role=tab]"), panes=box.querySelectorAll("[role=tabpanel]");
  btns.forEach((b,i)=>b.addEventListener("click",()=>{ btns.forEach((x,j)=>{x.setAttribute("aria-selected",i===j); panes[j].hidden=i!==j;}); }));
});
```

- **Jump and flash**: anchor chips with `scroll-margin-top:24px`; on click, flash the target
  (`el.style.boxShadow="0 0 0 3px var(--ring)"; setTimeout(()=>el.style.boxShadow="",1400)`).
- **Sticky chrome**: `aside{position:sticky;top:24px;align-self:start}` for key files, gotchas,
  TOC or pending changes; a sticky toolbar (`position:sticky;top:0;background:var(--background)`)
  with a live summary ("5 now · 7 next"). Show a side TOC only when there is gutter room.

## Linking

- **Click-to-inspect diagram**: a `DETAIL` map keyed by `data-k`, a sticky side panel, and
  the first node selected on load so the panel is never empty. Nodes get `tabindex="0"`
  and respond to Enter.

```js
nodes.forEach(n => n.addEventListener("click", () => {
  nodes.forEach(x => x.classList.toggle("active", x===n));
  const d = DETAIL[n.dataset.k]; title.textContent=d.title; body.textContent=d.body; code.textContent=d.code; }));
```

- **Linked highlights** (code ↔ notes, term ↔ glossary): on `mouseenter`/`focus` toggle
  `.active` on every `[data-p="${key}"]`. Style terms with a dotted clay underline.
- **Spectrum ↔ cards**: dot click runs `card.scrollIntoView({behavior:"smooth",block:"center"})`;
  checking a card adds `.on` to its dot.

## Live controls

- **CSS-variable controls**: sliders and toggles write `root.style.setProperty("--pad", v+"px")`
  and every variant reads the variable. Show the value beside each control.
- **Code tied to state**: keep a template in `data-snippet` and fill it from the controls
  (`raw.replace(/PAD/g, pad.value)`), so the code shown always matches the preview.
- **Segmented control without JS styling**: hidden radios plus
  `.seg label:has(input:checked){background:var(--muted)}`. Keep the radios focusable
  (`opacity:0;position:absolute`, not `display:none`).
- **Accessible toggle switch**: a transparent native checkbox over a styled track:
  `.toggle input{position:absolute;inset:0;opacity:0} .toggle input:checked+.track{background:var(--ok)} .toggle input:focus-visible+.track{outline:2px solid var(--ring)}`.
- **Variant switch by wrapper class**: `stage.className = "stage " + v` restyles one markup
  per option. For plan alternatives: `[data-variant=main] .v-alt{display:none}` and
  `[data-variant=alt] .v-main{display:none}`.
- **Dependency warnings in place**: when `f.requires && on && !state[f.requires]`, mark the
  row (clay left border), show a "requires X ⚠" chip, a banner with the count, and the count
  in the sidebar.
- **Live re-render with a diff readout**: keep the previous result, recompute, and report
  "N (x%) moved on last change". Batch input with `requestAnimationFrame`.
- **Template preview**: prefer a `<textarea>` with a highlighted preview beside it over
  `contenteditable`; mark filled slots and show missing ones in clay.

## Arrangement

- **Native drag and drop** for boards: `dragover` must `preventDefault()`; guard `dragleave`
  with `if(!col.contains(e.relatedTarget))`; dashed outline on the target, dimmed source.
  Always add a keyboard path (a select or move-up/down buttons per card).
- **Filter by dimming** (`opacity:.25`) rather than hiding, so the layout stays still; show a
  "filter: bug ×" badge that clears it.

## Questioning ADMIN

- **One-at-a-time interview**: questions as data
  `{radius, topic, q, why, opts:[{t,d}]}`, ordered by blast radius (architecture → data
  model → UX → polish). A progress rail lets ADMIN revisit answers; an "Other" input on every
  question; the finish screen is a decisions table plus the generated prompt.
- **Quiz with remediation**: questions as data `{q, opts, correct, anchor, excerpt}`; one
  attempt each; reveal the right answer; on a miss quote the excerpt and, at the end, link
  back to each missed section once. Questions are scenarios ("pod OOM-killed mid-render:
  what happens?"), not trivia. Vary the position of the correct option.

## Presenting

- **Deck**: `body{scroll-snap-type:y mandatory}`, each `section.slide{height:100vh;scroll-snap-align:start}`,
  arrow and space keys call `scrollIntoView`, an `IntersectionObserver` (threshold .6)
  updates a fixed "n / N" counter so wheel scrolling stays in sync. The decision slide is
  inverted with the leaning option outlined.
- **Scripted demo loop** when the flow itself is the argument:
  `const at=(ms,fn)=>timers.push(setTimeout(fn,ms))`, a `reset()` that clears timers and
  forces reflow (`void el.offsetWidth`), and a Replay button. Skip under reduced motion.
- **Download a figure**: `new XMLSerializer().serializeToString(svg)` → `Blob` (`image/svg+xml`)
  → object URL → `a.download`; revoke the URL afterwards.

## Motion

Motion only to show a state change or to let ADMIN judge real motion. Drive a whole
sequence from one class toggle with staggered `transition-delay`; put the easing in one
`--ease` variable so a sandbox can swap it. Always wrap in
`@media (prefers-reduced-motion:no-preference)` or rely on the template's reduce rule.
