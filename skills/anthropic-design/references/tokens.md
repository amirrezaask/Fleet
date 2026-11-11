# Tokens

Values measured on 2026-11-12 from the Claude desktop app bundle (5.1231.2), the
claude.ai stylesheet, and anthropic.com. Light value first, dark second. "ink" means
the register's ink color at the given opacity. Stops drift by a step between releases;
the relationships matter more than any one hex.

Ready-to-use encodings: [tokens.css](../assets/web/tokens.css) and
[theme.rs](../assets/gpui/src/theme.rs).

## Contents

- [Product register: color](#product-register-color)
- [Brand register: color](#brand-register-color)
- [Typography](#typography)
- [Space and size](#space-and-size)
- [Radius](#radius)
- [Elevation](#elevation)
- [Motion](#motion)
- [Layout measures](#layout-measures)

## Product register: color

Ink is `#000000` on light and `#ffffff` on dark. The gray ramp has zero saturation.

| Role | Light | Dark |
| --- | --- | --- |
| Surface 0, window ground and sidebar | `#f9f9f9` | `#0b0b0b` |
| Surface 1, page | `#ffffff` | `#191919` |
| Surface 2, panels and cards | `#ffffff` | `#1f1f1f` |
| Surface popover, menus and dialogs | `#ffffff` | `#303030` |
| Text primary | ink 90% | ink 93% |
| Text secondary | ink 60% | ink 57% |
| Text muted | ink 47% | ink 40% |
| Text disabled | ink 35% | ink 35% |
| Border default, hairline rings | ink 8% | ink 4% |
| Border line, dividers | ink 12% | ink 12% |
| Border strong | ink 20% | ink 20% |
| Fill primary, the default button | `#191919` | `#efefef` |
| Fill primary hover | `#3c3c3c` | `#d7d7d7` |
| On primary | `#ffffff` | `#191919` |
| Fill secondary | ink 5% | ink 15% |
| Fill secondary hover | ink 8% | ink 22% |
| Fill ghost hover, row hover | ink 5% | ink 8% |
| Fill ghost selected, row selected | ink 10% | ink 15% |
| Fill card | ink 4% | ink 3% |
| Fill field, inputs | `#ffffff` 50% | ink 5% |
| Fill control, switch tracks and sliders | ink 10% | ink 10% |
| User message background | ink 5% | ink 5% |
| Tooltip background / text | `#0b0b0b` / `#ffffff` | `#303030` / ink 93% |
| Modal backdrop | `#000000` 40% | `#000000` 50% |

Brand and status. Fills are the same in both modes; text flips to stay readable.

| Role | Fill | Fill hover | Text light | Text dark |
| --- | --- | --- | --- | --- |
| Clay (brand) | `#c6613f` | `#d97757` | n/a | n/a |
| Accent (focus, links, selection) | `#257de0` | `#2171ca` | `#1757ac` | `#6aabf1` |
| Danger | `#c83839` / `#dc3c3d` | `#b43233` | `#a42528` | `#f17778` |
| Success | `#10a122` | `#0e911f` | `#006c10` | `#53c556` |
| Warning | `#fbb315`, on `#442800` | `#e2a113` | `#895902` | `#e49c06` |

`#d97757` is Clay itself: the spark mark and brand illustration. `#c6613f` is the
emphasized stop used when clay is a button fill, so white text passes contrast.
Tinted backgrounds are the fill at 12% opacity; tinted borders at 22%.

Gray ramp, shared by both modes (light reads it top down, dark bottom up):
`#ffffff` `#fcfcfc` `#f9f9f9` `#f6f6f6` `#f3f3f3` `#efefef` `#ececec` `#e6e6e6`
`#e0e0e0` `#d1d1d1` `#c2c2c2` `#a4a4a4` `#878787` `#6b6b6b` `#515151` `#383838`
`#2c2c2c` `#202020` `#1a1a1a` `#151515` `#111111` `#0b0b0b`.

## Brand register: color

Every gray carries a little yellow, which is what makes the page read as paper.
Ink is `#141413`.

| Stop | Hex | Name / use |
| --- | --- | --- |
| 050 | `#faf9f5` | Ivory light, page background |
| 100 | `#f5f4ed` | Quiet button and chip fill |
| 150 | `#f0eee6` | Ivory medium, muted blocks and code |
| 200 | `#e8e6dc` | Ivory dark, borders |
| 300 | `#d1cfc5` | Cloud light, strong borders |
| 400 | `#b0aea5` | Cloud medium, muted text on dark |
| 500 | `#87867f` | Cloud dark, large or decorative muted text (3.5:1 on ivory) |
| 550 | `#73726c` | Small muted text on light (4.6:1 on ivory) |
| 600 | `#5e5d59` | Slate light, secondary text |
| 700 | `#3d3d3a` | Slate medium, button text |
| 750 | `#30302e` | Raised surface on dark |
| 800 | `#262624` | Dark page |
| 850 | `#1f1e1d` | Dark ground |
| 950 | `#141413` | Slate dark, ink |

Clay is `#d97757`; interactive clay is `#c6613f`. Focus is `#2c84db`. Error is
`#bf4d43`. Secondary swatches for illustration and data, never for chrome: oat
`#e3dacc`, cactus `#bcd1ca`, olive `#788c5d`, sky `#6a9bcc`, heather `#cbcadb`,
fig `#c46686`, coral `#ebcece`.

anthropic.com is a light site. The dark half of this register in `tokens.css` and
`theme.rs` is derived from the same ramp, not measured from a shipped dark page.

## Typography

Three families, each with a job.

| Family | Job | Open substitute |
| --- | --- | --- |
| Anthropic Sans | Interface: controls, labels, navigation, the user's own text | `system-ui` |
| Anthropic Serif | Voice: Claude's replies, display headings, greetings | Source Serif 4, Newsreader |
| Anthropic Mono | Code and data | `ui-monospace`, JetBrains Mono |

The Anthropic families are proprietary. They ship inside Anthropic's products; do not
redistribute them in your own. Name them first in the stack so they render where
they are installed, and pick the substitute deliberately. Both families are variable
fonts, and the product leans on that: weights are fractional.

| Weight role | CSS weight | Used for |
| --- | --- | --- |
| Regular | 400 | Body, prose |
| Control | 435 | Button and input labels |
| Medium | 500 | Badges, emphasized labels |
| Header | 520 | Section and pane titles |
| Semibold | 580 | Strong emphasis |
| Bold | 600 | The ceiling. 700 does not appear |

With a static substitute, map control to 400 or 500 and header to 500 or 600, and
keep the ceiling.

Product type scale, size / line height in px:

| Role | Size | Notes |
| --- | --- | --- |
| Caption | 12 / 17 | Metadata, timestamps |
| Footnote, code | 13 / 19 | Code is always 1px smaller than body |
| Body, controls | 14 / 20 | The default for all chrome |
| Heading | 15 / 20 | Weight 520, same color as body |
| Prose | 15 / 21, large 16 / 22 | Chat messages and documents |
| Title | 22 / 28 | Pane and page titles |
| Page header | 24 | One per page |
| Display | 38 / 44 | Serif, weight 300, optical size 48 |

Prose headings scale off the prose size: h1 1.75em, h2 1.375em, h3 1.125em, h4 1em,
with line height 1.25 to 1.3. Letter spacing stays at 0 everywhere in the product.

Brand type: body 16 / 24.5, small UI 13 / 20 with 0.01em tracking, serif headings at
weight 500 with -0.01em tracking and 1.2 line height, reading measure 720px.

## Space and size

The base unit is 4px. Padding and gap steps:

| Step | Padding | Gap |
| --- | --- | --- |
| xs | 6 | 8 |
| sm | 8 | 12 |
| md | 12 | 16 |
| lg | 16 | 28 |
| xl | 24 | 40 |

Control heights: 24 (xs), 28 (default), 40 (large, auth and marketing only). A
control nested inside another control is 22. Icons are 16 in dense rows and 20
elsewhere. Avatars are 20, 24, 32, 40. Checkbox and switch height is 20. Disabled
opacity is 0.4.

Brand spacing scale: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128. Section gaps
start at 48.

## Radius

| Token | px | Used for |
| --- | --- | --- |
| xs | 6 | Menu items, sidebar rows, kbd caps |
| default | 8 | Buttons, inputs, cards, chips |
| lg | 10 | Large (40px) buttons and fields |
| card | 12 | Message bubbles, code blocks, raised cards |
| composer | 14 | The composer and other hero containers |

When one rounded box sits inside another, inner radius = outer radius - padding.
Brand radii are 4, 8, 12, 16, and a full pill for navigation chips.

## Elevation

A raised surface is three things stacked: a lighter surface step, a hairline ring,
and a soft two-layer shadow. Each row lists ring, then contact shadow, then ambient
shadow.

| Level | Light | Dark |
| --- | --- | --- |
| Card | `0 0 0 1px` ink 6%, `0 4px 24px` black 4% | `inset 0 0 0 1px` white 6%, `0 4px 24px` black 8% |
| Small | `0 1px 2px` black 6%, `0 2px 8px` black 8% | `0 1px 2px` black 6%, `0 2px 8px` black 24% |
| Popover | `0 0 0 1px` black 8%, `0 2px 6px` black 8%, `0 8px 24px` black 12% | `inset 0 0 0 1px` white 4%, `0 2px 6px` black 20%, `0 8px 24px` black 32% |
| Floating window | `0 0 0 .5px` black 6%, `0 4px 12px` black 6%, `0 16px 40px` black 8% | `0 0 0 .5px` white 8%, `0 4px 12px` black 40%, `0 16px 40px` black 50% |

In dark mode the ring moves inside the box and turns white, and the shadow gets
three to four times stronger, because a shadow on a dark ground is nearly invisible.

Focus ring: `inset 0 0 0 1px` surface, `0 0 0 1px #257de0`, `0 0 6px 1px` accent at
12% (light) or 60% (dark). It follows the control's radius.

Layers: coachmark 35, modal 40, popover and tooltip 50, toast 60.

## Motion

| Token | Value | Used for |
| --- | --- | --- |
| fast | 60ms | Hover fills, focus ring, hover-out |
| snap | 120ms | Presses, menus, reveals, most state changes |
| base | 200ms | Panels, accordions, larger moves |
| sheet | 300ms | Sheets, sidebars, dialogs |
| slow | 450ms | Page-level and decorative transitions |

| Easing | Curve | Used for |
| --- | --- | --- |
| snap | `cubic-bezier(.32, .72, 0, 1)` | The default. Fast start, long soft landing |
| out | `cubic-bezier(.165, .84, .44, 1)` | Entrances and fades (ease-out-quart) |
| overshoot | `cubic-bezier(.34, 1.3, .64, 1)` | Small pops: badges, checkmarks |
| spring | `linear(0, .2459, .6526, .9468, 1.0764, 1.0915, 1.0585, 1.0219, .9993, .9914, .9921, .9957, .9988, 1.0004, 1)` | Button release |

Press feedback scales a button to 0.975 and a card to 0.99. Hover-revealed actions
wait 100ms, enter in 120ms, and leave in 60ms with no delay: slow to appear, quick
to get out of the way.

## Layout measures

| Measure | Value |
| --- | --- |
| Sidebar width | 288 |
| Sidebar row | 32 high, 14px text, 8 gap, 6 radius (compact: 26 high, 13px, 4 gap) |
| Window header | 48, toolbar strip 36 |
| Chat column | 768, wide 960 |
| Reading column (brand) | 720 |
| Menu gutter | 6 |
