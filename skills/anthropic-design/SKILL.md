---
name: anthropic-design
description: Design or restyle UI in Anthropic's design language, the look and feel of the Claude apps and anthropic.com. Covers tokens, type, elevation, motion and component specs, with runnable web (CSS, Tailwind, React) and Rust GPUI examples. Use when the user wants a Claude-like, Claude-style or Anthropic-style interface, mentions Clay or the Anthropic fonts, or styles a GPUI app to match Claude.
---

# Anthropic design language

The language is calm on purpose. The interface recedes so the conversation, the
document, or the code is the loudest thing on screen. Almost every rule below is a
way of removing something: a color, a border, a weight, a few hundred milliseconds.

It has two registers that share one grammar. Pick one before choosing any value,
because mixing them is the most common way to miss the look.

| | Product register | Brand register |
| --- | --- | --- |
| Where it lives | Claude desktop, claude.ai, tools you work in for hours | anthropic.com, docs, reports, landing and reading pages |
| Ground | Neutral gray, `#f9f9f9` / `#0b0b0b` | Warm paper, `#faf9f5` / `#262624` |
| Ink | Black or white at an opacity | Warm slate `#141413` ramp |
| Type | 14px Sans chrome, Serif only for Claude's voice | 16px body, Serif headings throughout |
| Density | 28px controls, 32px rows | Generous: 48px+ between sections |
| Shape | 8px controls, 14px composer | 8 to 16px, pills for navigation chips |

If the user says "like the Claude app", use product. If they say "Anthropic style"
for a page people read, or the project already uses ivory `#faf9f5`, use brand. When
it is unclear which they mean, ask; do not blend.

## Rules

1. **One ink, layered.** Text, dividers and quiet fills are the same ink at
   different opacities (90, 60, 47 percent for text; 8 to 12 for lines; 5 to 10 for
   fills). They stay correct on every surface, and hierarchy comes from opacity
   before it comes from size or weight. Do not introduce a gray hex per use.
2. **Elevation is surface + ring + soft shadow.** A raised thing is one surface
   step lighter, has a 1px hairline ring, and casts a wide, faint two-layer shadow.
   Never a solid gray border, never a single hard drop shadow. In dark mode the
   ring turns white and moves inside, and the shadow gets several times stronger.
3. **Two voices.** Sans is the tool speaking: every control, label and the user's
   own words. Serif is Claude speaking: assistant prose, greetings, display text.
   Mono is for code. A screen that is all Sans has lost the signature; a screen
   with Serif buttons has misused it.
4. **Quiet type.** Chrome is 14/20. Weights sit close together (400 body, 435
   controls, 520 headers) and stop at 600. Headings in chrome are the body size with
   a little more weight, not a bigger size. No uppercase labels, no letter spacing.
5. **Clay is a signature, not a paint.** `#d97757` marks the brand: a logo, one
   call to action on a brand page, an illustration. The default button is ink
   (`#191919` on light), focus and links are blue (`#257de0`), selection is an ink
   fill. If clay appears more than once on a product screen, remove one.
6. **Color is information.** Chrome has no hue. Red, green, amber and blue appear
   only when they carry status, and then as a 12 percent tint with darker text, not
   as a saturated block.
7. **Soft, concentric geometry.** 6px for rows and menu items, 8px for controls,
   12px for cards and bubbles, 14px for the composer. An inner radius is the outer
   radius minus the padding between them. Nothing in product chrome is a pill.
8. **Motion is fast and lands softly.** Most changes take 120ms on
   `cubic-bezier(.32, .72, 0, 1)`; hover fills take 60ms; sheets take 300ms. Things
   leave faster than they arrive. Nothing bounces except a button's 2.5 percent
   press. Honor reduced motion.
9. **Dense chrome, generous content.** Controls and rows are small and tight so
   the reading column can be wide open: a 768px measure, a turn gap near one line
   of text, and no boxes around the assistant's words.
10. **One hero container per screen.** The composer (or the primary card) gets the
    largest radius and the only prominent shadow. Everything else lies flat on its
    surface.

## Workflow

1. Decide the register and whether both modes are needed. Read the project's
   existing tokens first; extend them instead of adding a parallel set.
2. Start from the token file for the stack, [tokens.css](assets/web/tokens.css) or
   [theme.rs](assets/gpui/src/theme.rs). Trim to what the project uses.
3. Build surfaces before components: ground, page, raised. If the three steps read
   correctly in both modes with no content, the rest follows.
4. Take component dimensions from the specs, not from memory.
5. Check the result against the rules in both modes, then against the list below.

## What it is not

These are the tells that a screen only resembles the language:

- Gradients, glass, blur or glow used as decoration.
- Pure `#000` or `#fff` text. Text is ink at 90 or 93 percent.
- A clay or blue primary button on a product screen. It is ink.
- Borders drawn as solid mid-gray lines, or a card with a border and no ring logic.
- Weight 700, uppercase tracking, or oversized headings in chrome.
- Radii above 16px on controls, or pill buttons in product chrome.
- Animations longer than 300ms for a state change, or anything springy and large.
- Emoji as icons. Use 16 or 20px line icons at 1.5px stroke in the text color.
- Boxes, avatars or colored bubbles around assistant text.

## Limits

- The Anthropic Sans, Serif and Mono typefaces are proprietary. Name them first in
  font stacks so they render where installed, choose the substitute deliberately
  (see the tokens reference), and do not bundle them into something you distribute.
- The language is the system, not the marks. Do not use Anthropic's logos or the
  Claude spark, and do not present a product as made by Anthropic.
- Values were measured on 2026-11-12 and shift between releases. When exactness
  matters, re-measure from the shipped stylesheet instead of trusting a number here.

## References

Load only what the task needs.

| Task | Reference |
| --- | --- |
| Any exact value: color, type, space, radius, shadow, motion | [Tokens](references/tokens.md) |
| Building a button, field, composer, sidebar, menu, message, dialog | [Components](references/components.md) |
| CSS, Tailwind or React work | [Web](references/web.md), [tokens.css](assets/web/tokens.css), [example.html](assets/web/example.html) |
| Rust GPUI work | [GPUI](references/gpui.md), [theme.rs](assets/gpui/src/theme.rs), [main.rs](assets/gpui/src/main.rs) |
