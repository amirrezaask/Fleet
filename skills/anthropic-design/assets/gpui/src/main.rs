//! The same app shell as `assets/web/example.html`, in GPUI: sidebar, transcript,
//! composer, buttons and a menu, switchable between registers and modes.
//!
//! Run with `cargo run`. To see the real typefaces, point ANTHROPIC_FONTS_DIR at
//! a folder holding the Anthropic .ttf files (see references/gpui.md).

// The token file is a complete palette meant to be copied; this demo does not
// touch every token.
#[allow(dead_code)]
mod theme;

use std::time::Duration;

use gpui::{
    Animation, AnimationExt, App, Application, Bounds, Context, Div, Hsla, SharedString, Stateful,
    TitlebarOptions, Window, WindowAppearance, WindowBounds, WindowOptions, div, point, prelude::*,
    px, relative, size, transparent_black,
};
use theme::*;

#[derive(Clone, Copy, PartialEq)]
enum Mode {
    Auto,
    Light,
    Dark,
}

struct Shell {
    register: Register,
    mode: Mode,
    selected: usize,
    fonts: Fonts,
}

const SESSIONS: [&str; 5] = [
    "Design tokens for the board",
    "Fix flaky install test",
    "Draft the release notes",
    "Port the importer to Effect",
    "Why is the build slow?",
];

#[derive(Clone, Copy)]
enum ButtonKind {
    Primary,
    Secondary,
    Ghost,
    Brand,
}

/// A 28px control. Hover is a fill step that lands in 60ms on the web; GPUI
/// applies hover styles instantly, which reads the same at that duration.
fn button(id: impl Into<gpui::ElementId>, label: &'static str, kind: ButtonKind, t: &Theme) -> Stateful<Div> {
    let (fill, hover, ink): (Hsla, Hsla, Hsla) = match kind {
        ButtonKind::Primary => (t.fill_primary, t.fill_primary_hover, t.on_primary),
        ButtonKind::Secondary => (t.fill_secondary, t.fill_secondary_hover, t.text),
        ButtonKind::Ghost => (transparent_black(), t.fill_hover, t.text_secondary),
        ButtonKind::Brand => (t.fill_brand, t.fill_brand_hover, t.on_brand),
    };

    div()
        .id(id)
        .flex()
        .flex_none()
        .items_center()
        .justify_center()
        .h(px(CONTROL))
        .px(px(PAD_MD))
        .rounded(px(RADIUS))
        .bg(fill)
        .text_color(ink)
        .font_weight(WEIGHT_CONTROL)
        .hover(move |style| style.bg(hover))
        // GPUI cannot scale a div, so the press is a dip in opacity instead of
        // the 0.975 scale the web uses.
        .active(|style| style.opacity(0.8))
        .child(label)
}

/// A segmented control: a quiet track with one raised thumb.
fn segmented<T: Copy + PartialEq + 'static>(
    name: &'static str,
    options: &[(&'static str, T)],
    current: T,
    t: &Theme,
    cx: &mut Context<Shell>,
    set: fn(&mut Shell, T),
) -> Div {
    let mut track = div().flex().gap(px(2.)).p(px(2.)).rounded(px(RADIUS)).bg(t.fill_hover);

    for (index, (label, value)) in options.iter().copied().enumerate() {
        let on = value == current;
        track = track.child(
            div()
                .id((name, index))
                .flex()
                .items_center()
                .h(px(CONTROL_XS))
                .px(px(PAD_SM))
                .rounded(px(RADIUS_XS))
                .font_weight(WEIGHT_CONTROL)
                .text_color(if on { t.text } else { t.text_secondary })
                .when(on, |thumb| thumb.bg(t.surface_2).shadow(t.shadow_sm()))
                .on_click(cx.listener(move |shell, _, _, cx| {
                    set(shell, value);
                    cx.notify();
                }))
                .child(label),
        );
    }

    track
}

impl Shell {
    fn sidebar(&self, t: &Theme, cx: &mut Context<Self>) -> Div {
        let label = |text: &'static str| {
            div()
                .px(px(PAD_SM))
                .pt(px(PAD_MD))
                .pb(px(PAD_XS))
                .text_size(px(TEXT_CAPTION.0))
                .line_height(px(TEXT_CAPTION.1))
                .text_color(t.text_muted)
                .child(text)
        };

        let mut list = div()
            .flex()
            .flex_col()
            .flex_none()
            .gap(px(2.))
            .w(px(SIDEBAR))
            // Clear the traffic lights: the titlebar is transparent.
            .pt(px(HEADER))
            .px(px(PAD_SM))
            .child(button("new-session", "New session", ButtonKind::Secondary, t))
            .child(label("Today"));

        for (index, title) in SESSIONS.iter().copied().enumerate() {
            if index == 3 {
                list = list.child(label("Yesterday"));
            }

            let selected = index == self.selected;
            let (fill_hover, text) = (t.fill_hover, t.text);

            list = list.child(
                div()
                    .id(("session", index))
                    .flex()
                    .flex_none()
                    .items_center()
                    .h(px(ROW))
                    .px(px(PAD_SM))
                    .rounded(px(RADIUS_XS))
                    .text_color(t.text_secondary)
                    .hover(move |style| style.bg(fill_hover).text_color(text))
                    .when(selected, |row| row.bg(t.fill_selected).text_color(t.text))
                    .on_click(cx.listener(move |shell, _, _, cx| {
                        shell.selected = index;
                        cx.notify();
                    }))
                    .child(div().truncate().child(title)),
            );
        }

        list
    }

    fn header(&self, t: &Theme, cx: &mut Context<Self>) -> Div {
        div()
            .flex()
            .flex_none()
            .items_center()
            .justify_between()
            .h(px(HEADER))
            .px(px(PAD_LG))
            .border_b_1()
            .border_color(t.border)
            .child(
                div()
                    .text_size(px(TEXT_HEADING.0))
                    .line_height(px(TEXT_HEADING.1))
                    .font_weight(WEIGHT_HEADER)
                    .child(SESSIONS[self.selected]),
            )
            .child(
                div()
                    .flex()
                    .gap(px(GAP_XS))
                    .child(segmented(
                        "register",
                        &[("Product", Register::Product), ("Brand", Register::Brand)],
                        self.register,
                        t,
                        cx,
                        |shell, value| shell.register = value,
                    ))
                    .child(segmented(
                        "mode",
                        &[("Auto", Mode::Auto), ("Light", Mode::Light), ("Dark", Mode::Dark)],
                        self.mode,
                        t,
                        cx,
                        |shell, value| shell.mode = value,
                    )),
            )
    }

    fn transcript(&self, t: &Theme) -> impl IntoElement {
        let prose = |parent: Div| parent.text_size(px(TEXT_PROSE.0)).line_height(px(TEXT_PROSE.1));

        // The user speaks in Sans, inside a quiet bubble.
        let user = div().flex().justify_end().child(
            prose(div())
                .max_w(relative(0.85))
                .px(px(PAD_MD))
                .py(px(PAD_SM))
                .rounded(px(RADIUS_CARD))
                .bg(t.fill_user_message)
                .child("Which radius should the task cards use?"),
        );

        let code = div()
            .px(px(PAD_LG))
            .py(px(PAD_MD))
            .rounded(px(RADIUS_CARD))
            .bg(t.fill_card)
            .border_1()
            .border_color(t.border)
            .font_family(self.fonts.mono.clone())
            .text_size(px(TEXT_CODE.0))
            .line_height(px(TEXT_CODE.1))
            .child(".column { border-radius: 12px; padding: 4px; }")
            .child(".card   { border-radius: 8px; }");

        // The assistant speaks in Serif, with no container at all, and rises
        // 6px into place on the entrance curve.
        let assistant = prose(div())
            .relative()
            .flex()
            .flex_col()
            .gap(px(PAD_MD))
            .font_family(self.fonts.serif.clone())
            .child(
                "Use an 8px radius for the cards and keep 12px for the column they sit in. \
                 The column has 4px of padding, so the nested corners stay concentric.",
            )
            .child(
                div()
                    .text_size(px(TEXT_PROSE.0 * 1.375))
                    .line_height(relative(1.25))
                    .font_weight(WEIGHT_HEADER)
                    .child("Why not match them"),
            )
            .child(
                "Two boxes with the same radius, one inside the other, look pinched at the \
                 corners. The inner radius should be the outer radius minus the padding.",
            )
            .child(code)
            .child(
                div()
                    .flex()
                    .gap(px(GAP_XS))
                    .font_family(self.fonts.sans.clone())
                    .text_size(px(TEXT_BODY.0))
                    .line_height(px(TEXT_BODY.1))
                    .child(button("copy", "Copy", ButtonKind::Ghost, t))
                    .child(button("retry", "Retry", ButtonKind::Ghost, t)),
            )
            .with_animation(
                "reply-in",
                Animation::new(Duration::from_millis(DUR_SHEET_MS)).with_easing(ease_out()),
                |reply, progress| reply.opacity(progress).top(px((1. - progress) * 6.)),
            );

        let buttons = div()
            .flex()
            .flex_wrap()
            .gap(px(GAP_XS))
            .child(button("primary", "Primary", ButtonKind::Primary, t))
            .child(button("secondary", "Secondary", ButtonKind::Secondary, t))
            .child(button("ghost", "Ghost", ButtonKind::Ghost, t))
            .child(button("brand", "Brand", ButtonKind::Brand, t));

        div().id("transcript").flex_1().overflow_y_scroll().px(px(PAD_LG)).py(px(PAD_XL)).child(
            div()
                .mx_auto()
                .w_full()
                .max_w(px(MEASURE))
                .flex()
                .flex_col()
                .gap(px(GAP_LG))
                .text_size(px(TEXT_BODY.0))
                .child(user)
                .child(assistant)
                .child(div().flex().flex_wrap().items_start().gap(px(GAP_LG)).child(buttons).child(self.menu(t))),
        )
    }

    /// A menu: popover surface, ring, two-layer shadow, 6px gutter. It pops in
    /// on the snap curve, the default for state changes.
    fn menu(&self, t: &Theme) -> impl IntoElement {
        let item = |id: &'static str, label: &'static str, hint: &'static str, ink: Hsla| {
            let fill_hover = t.fill_hover;
            div()
                .id(id)
                .flex()
                .items_center()
                .justify_between()
                .h(px(CONTROL))
                .px(px(PAD_SM))
                .rounded(px(RADIUS_XS))
                .text_color(ink)
                .hover(move |style| style.bg(fill_hover))
                .child(label)
                .child(
                    div().text_size(px(TEXT_CAPTION.0)).text_color(t.text_muted).child(hint),
                )
        };

        div()
            .flex()
            .flex_col()
            .w(px(208.))
            .p(px(PAD_XS))
            .rounded(px(RADIUS_LG))
            .bg(t.surface_popover)
            .border_1()
            .border_color(t.border)
            .shadow(t.shadow_popover())
            .child(item("rename", "Rename", "R", t.text))
            .child(item("duplicate", "Duplicate", "D", t.text))
            .child(div().my(px(PAD_XS)).h(px(1.)).bg(t.border_line))
            .child(item("delete", "Delete", "", t.text_danger))
            .with_animation(
                "menu-in",
                Animation::new(Duration::from_millis(DUR_SNAP_MS)).with_easing(ease_snap()),
                |menu, progress| menu.opacity(progress),
            )
    }

    /// The composer is the one hero container: largest radius, raised, ringed.
    /// It is a static placeholder here. For a real text field use the `input`
    /// example in the gpui crate or a component library.
    fn composer(&self, t: &Theme) -> Div {
        div().flex_none().px(px(PAD_LG)).pb(px(PAD_LG)).child(
            div()
                .mx_auto()
                .w_full()
                .max_w(px(MEASURE))
                .p(px(PAD_SM))
                .rounded(px(RADIUS_COMPOSER))
                .bg(t.surface_2)
                .border_1()
                .border_color(t.border)
                .shadow(t.shadow_card())
                .child(
                    div()
                        .h(px(44.))
                        .px(px(PAD_SM))
                        .py(px(PAD_XS))
                        .text_size(px(TEXT_PROSE.0))
                        .line_height(px(TEXT_PROSE.1))
                        .text_color(t.text_muted)
                        .child("Reply…"),
                )
                .child(
                    div()
                        .flex()
                        .items_center()
                        .justify_between()
                        .child(button("attach", "Attach", ButtonKind::Ghost, t))
                        .child(button("send", "Send", ButtonKind::Primary, t)),
                ),
        )
    }
}

impl Render for Shell {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let dark = match self.mode {
            Mode::Auto => matches!(
                window.appearance(),
                WindowAppearance::Dark | WindowAppearance::VibrantDark
            ),
            Mode::Light => false,
            Mode::Dark => true,
        };
        let t = Theme::new(self.register, dark);

        // The window ground is surface 0. The sidebar sits directly on it; the
        // main pane is one surface step up, joined to the ground by a ring.
        div()
            .size_full()
            .flex()
            .bg(t.surface_0)
            .text_color(t.text)
            .font_family(self.fonts.sans.clone())
            .font_weight(WEIGHT_REGULAR)
            .text_size(px(TEXT_BODY.0))
            .line_height(px(TEXT_BODY.1))
            .child(self.sidebar(&t, cx))
            .child(
                div()
                    .flex()
                    .flex_col()
                    .flex_1()
                    .min_w_0()
                    .my(px(PAD_SM))
                    .mr(px(PAD_SM))
                    .rounded(px(RADIUS_CARD))
                    .bg(t.surface_1)
                    .border_1()
                    .border_color(t.border)
                    .shadow(t.shadow_card())
                    .overflow_hidden()
                    .child(self.header(&t, cx))
                    .child(self.transcript(&t))
                    .child(self.composer(&t)),
            )
    }
}

fn main() {
    Application::new().run(|cx: &mut App| {
        if let Ok(dir) = std::env::var("ANTHROPIC_FONTS_DIR") {
            load_fonts(&dir, cx);
        }
        let fonts = Fonts::resolve(cx);

        let bounds = Bounds::centered(None, size(px(1120.), px(760.)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some(SharedString::from("Anthropic design language")),
                    appears_transparent: true,
                    traffic_light_position: Some(point(px(16.), px(16.))),
                }),
                ..Default::default()
            },
            |window, cx| {
                cx.new(|cx| {
                    // Re-render when the OS switches between light and dark.
                    cx.observe_window_appearance(window, |_, _, cx| cx.notify()).detach();
                    Shell { register: Register::Product, mode: Mode::Auto, selected: 0, fonts }
                })
            },
        )
        .unwrap();
        cx.activate(true);
    });
}
