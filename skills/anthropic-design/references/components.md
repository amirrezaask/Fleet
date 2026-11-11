# Components

Framework-neutral specs for the product register. Token names refer to
[Tokens](tokens.md). Dimensions marked with a dagger (†) are measured from the
shipped apps; the rest are composed from the token set and the rules, so treat them
as a sound default, not a fact about Anthropic's code.

For the brand register keep the anatomy, swap the palette, and loosen the spacing
one step.

## Button

| Property | Value |
| --- | --- |
| Height | 28† (xs 24†, large 40†) |
| Padding | 0 x 12 |
| Radius | 8† (large 10†) |
| Label | 14 / 20, weight 435† |
| Gap to icon | 6 |
| Hover | Fill step, 60ms† |
| Press | Scale 0.975 with the spring curve† |
| Disabled | Opacity 0.4†, no pointer events |

| Variant | Fill | Hover | Label | Use |
| --- | --- | --- | --- | --- |
| Primary | fill primary | fill primary hover | on primary | The one main action in a view |
| Secondary | fill secondary | fill secondary hover | text | Everything else that needs to look like a button |
| Ghost | none | fill ghost hover | text secondary, text on hover | Toolbars, message actions, dense rows |
| Brand | `#c6613f` | `#d97757` | white | One call to action on a brand surface |
| Danger | fill danger | darker step | white | Confirming a destructive action, never the trigger |

Icon-only buttons are square at the control height with the same radius. On desktop
the cursor over a button stays an arrow; the pointer hand is for links.

## Text field

Height 28 (large 40), radius 8, padding 0 x 8. Fill is `fill field`: half-opaque
white on light, ink 5% on dark, with a 1px ring in `border`. Hover darkens the ring
to `border strong`. Focus replaces it with the focus ring. Placeholder is `text
muted`. Labels sit above in 14 / 20 at weight 435; help text below in 12 / 17
`text secondary`; errors in `text danger` with the danger focus ring.

## Composer

The hero container, and the place where the language is most recognizable.

| Property | Value |
| --- | --- |
| Width | The reading measure, 768† |
| Radius | 14† (compact 12†) |
| Surface | Surface 2 with the card shadow and ring |
| Padding | 8†, text inset another 8 |
| Text | Sans, prose size (15 / 21), placeholder in text muted |
| Footer row | Ghost buttons on the start side, one primary button at the end |
| Focus | No blue ring. The hairline ring strengthens to border strong |

The composer does not show the standard focus ring because it is nearly always
focused; a persistent blue outline would be the loudest thing on screen.

## Sidebar

| Property | Value |
| --- | --- |
| Width | 288† |
| Surface | Surface 0, no divider against the window edge |
| Row height | 32† (compact 26†) |
| Row text | 14† / 20, text secondary, one line with ellipsis |
| Row radius | 6† |
| Row padding | 0 x 8, 8† gap to a 16 or 20† icon |
| Hover | fill ghost hover†, text becomes primary |
| Selected | fill ghost selected†, text primary, no accent bar |
| Group label | 12† / 17, text muted, sentence case |

Row actions appear on hover at the end of the row, and the label fades out under
them with a mask instead of being truncated abruptly.

## Segmented control

A track in `fill ghost hover` with 2px padding and radius 8. The selected thumb is
surface 2 with the small shadow and radius 6. Labels are 14 / 20 at weight 435,
`text secondary` at rest and `text` when selected. The thumb moves in 120ms on the
snap curve.

## Menu and popover

| Property | Value |
| --- | --- |
| Surface | Surface popover with the popover shadow and ring |
| Radius | 10 |
| Padding (gutter) | 6† |
| Item height | 28 |
| Item radius | 6 |
| Item padding | 0 x 8 |
| Item hover | fill ghost hover |
| Separator | 1px border line, 6 above and below |
| Shortcut hint | 12px, text muted, end-aligned |
| Enter / exit | Opacity over 120ms on the snap curve / 60ms |

Destructive items are `text danger` and sit last, after a separator.

## Dialog

Backdrop is black at 40% (light) or 50% (dark)†. The panel is surface popover with
the floating-window shadow, radius 14, padding 24, and a maximum width near 480. The
title is 15 / 20 at weight 520, the body is 14 / 20 `text secondary`, and actions are
end-aligned with the primary button last. It enters over 300ms on the entrance
curve, rising a few pixels, and leaves in about half that.

## Tooltip

Background `#0b0b0b` (light) or `#303030` (dark)†, white text at 12 / 17, radius 6,
padding 4 x 8. Appears after a short delay, fades in 120ms, and has no arrow.

## Messages

| | User | Assistant |
| --- | --- | --- |
| Family | Sans† | Serif† |
| Size | Prose, 15 / 21† | Prose, 15 / 21† |
| Container | Bubble in ink 5%†, radius 12†, padding 8 x 12, end-aligned, max 85% | None. Text sits directly on the page |
| Actions | On hover | Ghost buttons below, revealed after a 100ms† delay |

The gap between turns is about three quarters of a line of prose†; between a
message and its own actions, 8. Streaming text simply appears; there is no cursor
animation competing with the words.

## Code

Inline code is Mono at 13px on `fill card` with a 1px inset ring and radius 6.
Blocks use the same fill and ring, radius 12, padding 12 x 16, and 13 / 19 Mono. A
block header, if present, is a 36px strip with the language name in 12px `text
muted` and a ghost copy button.

## Card

Surface 2, radius 12 (8 inside dense lists), the card shadow and ring, padding 16.
A clickable card presses to scale 0.99† and shifts its fill by one step on hover.
Cards do not nest; inside a card, group with spacing and a `border line` divider.

## Badge

Height 20, radius 6, padding 0 x 6, 12px text at weight 500†. Neutral badges use
ink 5% with `text secondary`. Status badges use the status fill at 12% with the
matching status text color, never a solid saturated block.

## Switch and checkbox

Both are 20† high. The switch track is ink 20% (light) or 10% (dark)† and becomes
`fill primary` when on; the knob is white. A checkbox is a 6-radius box with a
`border strong` ring that fills with `fill primary` and shows an `on primary` check.
On and off are ink, not blue or green: the state is clear from the shape.

## Keyboard hint

A transparent cap with a 1px ink 16 to 20% ring†, radius 4, 12px Sans in `#6b6b6b`
(light) or `#a4a4a4` (dark)†. Inside menus, drop the cap and show the bare key.

## Empty state and greeting

One line of Serif at display size (38 / 44, weight 300)† in `text`, centered above
the composer, with no illustration and no supporting paragraph. This is the only
place display type appears in the product.
