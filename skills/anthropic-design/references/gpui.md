# GPUI

How to apply the language in a Rust GPUI app. The tokens are
[theme.rs](../assets/gpui/src/theme.rs); the same app shell as the web example is
[main.rs](../assets/gpui/src/main.rs). Both compile against `gpui = "=0.2.2"` from
crates.io.

GPUI's API still moves between releases, and Zed's in-tree `gpui` is ahead of the
published crate. If the project uses another version, keep the token values and
the structure, and check each call against that version's source before trusting a
signature from here.

## Running the example

```bash
cd assets/gpui && cargo run
```

GPUI compiles its Metal shaders at build time, which needs the full Xcode install.
With only the Command Line Tools the build fails with `unable to find utility
"metal"`; compile the shaders at startup instead:

```bash
cd assets/gpui && cargo run --features runtime_shaders
```

To see the real typefaces, point `ANTHROPIC_FONTS_DIR` at a folder of the Anthropic
`.ttf` files. The Claude desktop app ships the Sans and Serif variable fonts:

```bash
cd assets/gpui && ANTHROPIC_FONTS_DIR="/Applications/Claude.app/Contents/Resources/fonts" cargo run
```

That is for looking at your own screen. The fonts are proprietary, so do not copy
them into a repository or bundle them with an app you distribute.

## Using the theme

Copy `theme.rs` into the project and build one `Theme` per render from the register
and the window's appearance. A `Theme` is a few dozen `Hsla` values, so creating it
each frame costs nothing and avoids a stale copy.

```rust
impl Render for Shell {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let dark = matches!(
            window.appearance(),
            WindowAppearance::Dark | WindowAppearance::VibrantDark
        );
        let t = Theme::new(Register::Product, dark);

        div().size_full().bg(t.surface_0).text_color(t.text)
    }
}
```

Re-render when the OS switches mode, or the window keeps the old palette until the
next unrelated update:

```rust
cx.observe_window_appearance(window, |_, _, cx| cx.notify()).detach();
```

If the project already has a theme global, add these roles to it instead of
introducing `Theme` beside it.

## From CSS to GPUI

| Web | GPUI |
| --- | --- |
| `var(--ad-surface-1)` | `t.surface_1` |
| `light-dark(a, b)` | `Theme::new(register, dark)` picks the half |
| `data-register="brand"` | `Register::Brand` |
| `rgb(0 0 0 / 0.6)` | `hsla(0., 0., 0., 0.6)` |
| `#191919` | `rgb(0x191919).into()` |
| `height: var(--ad-control)` | `.h(px(CONTROL))` |
| `border-radius: var(--ad-radius)` | `.rounded(px(RADIUS))` |
| `font-weight: 435` | `.font_weight(FontWeight(435.))` |
| `font: 14px / 20px` | `.text_size(px(14.)).line_height(px(20.))` |
| `box-shadow: var(--ad-shadow-card)` | `.border_1().border_color(t.border).shadow(t.shadow_card())` |
| `:hover { background }` | `.id("x").hover(\|s\| s.bg(t.fill_hover))` |
| `:active` | `.id("x").active(\|s\| s.opacity(0.8))` |
| `transition` / `@keyframes` | `.with_animation(id, Animation::new(d).with_easing(f), \|el, p\| ...)` |
| `cubic-bezier(.32, .72, 0, 1)` | `theme::ease_snap()` |
| `max-width: 48rem; margin: auto` | `.mx_auto().w_full().max_w(px(MEASURE))` |
| `text-overflow: ellipsis` | `.truncate()` |
| `overflow-y: auto` | `.id("x").overflow_y_scroll()` |

`.hover`, `.active`, `.on_click` and scrolling need an element with an `.id(...)`.
An id is a `&'static str`, or a `(&'static str, usize)` pair for list items.

Text style cascades to children in GPUI, as it does in CSS. Set family, size,
leading and color once on the root and override only where a voice changes: Serif
on the assistant's message, Mono on code, and back to Sans for the action buttons
inside the message.

## Where GPUI differs

The language was specified on the web. These are the places GPUI cannot express it
directly, and the substitute that keeps the look.

| CSS feature | GPUI | Do this |
| --- | --- | --- |
| Inset or spread ring in `box-shadow` | `BoxShadow` has no inset | Draw the ring as `.border_1().border_color(t.border)`. Both modes use the same token; it is black at 8% on light and white at 4% on dark |
| Hover transitions | Hover style applies instantly | Accept it. The web hover is 60ms, which reads as instant |
| `scale` on press | A `div` cannot be transformed | Dip opacity to 0.8 in `.active`. Do not fake a scale by changing size; it moves the layout |
| `cubic-bezier()`, `linear()` | Only `linear`, `quadratic`, `ease_in_out`, `ease_out_quint`, `bounce` | Use `cubic_bezier(x1, y1, x2, y2)` from `theme.rs`. Skip the spring curve |
| Exit animations | An element removed from the tree is gone | Keep a `closing` flag in state, animate opacity down over 60ms, then remove |
| Font fallback list | One family per element; a missing family falls back to the system sans | Resolve the stack once with `Fonts::resolve(cx)` and store the result |
| `rem` and zoom | Sizes are `px` unless you use `rems` | Use `px` constants from `theme.rs`; switch to `rems` only if the app has a UI scale setting |
| `backdrop-filter` | Not available on elements | Not needed. The language does not use blur |
| Text input | No built-in field | Start from the `input` example in the gpui crate, or a component library, and style it from the specs |

An animation runs when its element first appears and restarts when its id changes.
To replay an entrance for new content, include something that changes in the id,
such as the message index: `.with_animation(("reply-in", index), ...)`.

## Fonts

`Fonts::resolve` walks a candidate list per voice and returns the first installed
family. This matters most for Serif: if GPUI is handed a family it cannot find it
silently uses the system sans, and the two-voice signature disappears with no error.

```rust
if let Ok(dir) = std::env::var("ANTHROPIC_FONTS_DIR") {
    load_fonts(&dir, cx);
}
let fonts = Fonts::resolve(cx);
```

Measured on macOS with the fonts loaded, the families register as `Anthropic Sans`
and `Anthropic Serif`. Without them the example resolves to the system UI font,
Charter and Menlo or JetBrains Mono. If the app ships its own substitute (Source
Serif 4 is the closest open one), embed it with `include_bytes!` and pass it to
`cx.text_system().add_fonts(...)` before resolving.

Fractional weights such as `FontWeight(435.)` render exactly with a variable font
and snap to the nearest instance otherwise.

## Window chrome

The product register runs content to the top edge of the window. On macOS:

```rust
titlebar: Some(TitlebarOptions {
    title: Some("App".into()),
    appears_transparent: true,
    traffic_light_position: Some(point(px(16.), px(16.))),
}),
```

Then leave a `HEADER` (48px) inset at the top of the sidebar so rows clear the
traffic lights. The window background is `surface_0`; the main pane is `surface_1`
with the card radius, an 8px margin on the top, bottom and trailing edges, and the
card ring, so it reads as a sheet resting on the window.

## Checks

- Switch the OS between light and dark with the app open. The palette should follow
  without a restart.
- Compare a screenshot with the web example in the same register and mode. Surface
  steps, text opacity and radii should match; shadows will be slightly softer.
- Look at the assistant's message. If it is not in a serif face, font resolution
  failed.
