//! Anthropic design language tokens for GPUI.
//!
//! Values and their sources are documented in `references/tokens.md`. Copy this
//! file into a project and trim it to the tokens the project uses.

use std::borrow::Cow;

use gpui::{App, BoxShadow, FontWeight, Hsla, SharedString, hsla, point, px, rgb, rgba};

/// Which half of the language a surface speaks: neutral product chrome or warm
/// brand paper. Roles are identical across both; only values change.
#[derive(Clone, Copy, PartialEq)]
pub enum Register {
    Product,
    Brand,
}

// Sizes in px. GPUI has no cascade, so these are constants, not theme fields.
pub const CONTROL_XS: f32 = 24.;
pub const CONTROL: f32 = 28.;
pub const ROW: f32 = 32.;
pub const HEADER: f32 = 48.;
pub const SIDEBAR: f32 = 288.;
pub const MEASURE: f32 = 768.;

pub const PAD_XS: f32 = 6.;
pub const PAD_SM: f32 = 8.;
pub const PAD_MD: f32 = 12.;
pub const PAD_LG: f32 = 16.;
pub const PAD_XL: f32 = 24.;
pub const GAP_XS: f32 = 8.;
pub const GAP_LG: f32 = 28.;

pub const RADIUS_XS: f32 = 6.;
pub const RADIUS: f32 = 8.;
pub const RADIUS_LG: f32 = 10.;
pub const RADIUS_CARD: f32 = 12.;
pub const RADIUS_COMPOSER: f32 = 14.;

pub const TEXT_CAPTION: (f32, f32) = (12., 17.);
pub const TEXT_CODE: (f32, f32) = (13., 19.);
pub const TEXT_BODY: (f32, f32) = (14., 20.);
pub const TEXT_HEADING: (f32, f32) = (15., 20.);
pub const TEXT_PROSE: (f32, f32) = (15., 21.);

// The families are variable fonts, so the fractional weights render as written.
// A static substitute rounds them to its nearest instance.
pub const WEIGHT_REGULAR: FontWeight = FontWeight(400.);
pub const WEIGHT_CONTROL: FontWeight = FontWeight(435.);
pub const WEIGHT_HEADER: FontWeight = FontWeight(520.);

pub const DUR_SNAP_MS: u64 = 120;
pub const DUR_SHEET_MS: u64 = 300;

#[derive(Clone)]
pub struct Theme {
    pub dark: bool,

    pub surface_0: Hsla,
    pub surface_1: Hsla,
    pub surface_2: Hsla,
    pub surface_popover: Hsla,

    pub text: Hsla,
    pub text_secondary: Hsla,
    pub text_muted: Hsla,
    pub text_danger: Hsla,

    pub border: Hsla,
    pub border_line: Hsla,

    pub fill_primary: Hsla,
    pub fill_primary_hover: Hsla,
    pub on_primary: Hsla,
    pub fill_secondary: Hsla,
    pub fill_secondary_hover: Hsla,
    pub fill_hover: Hsla,
    pub fill_selected: Hsla,
    pub fill_card: Hsla,
    pub fill_user_message: Hsla,

    pub fill_brand: Hsla,
    pub fill_brand_hover: Hsla,
    pub on_brand: Hsla,
}

fn hex(value: u32) -> Hsla {
    rgb(value).into()
}

impl Theme {
    pub fn new(register: Register, dark: bool) -> Self {
        match register {
            Register::Product => Self::product(dark),
            Register::Brand => Self::brand(dark),
        }
    }

    /// Neutral grays. Text, lines and quiet fills are one ink at an opacity, so
    /// they sit correctly on every surface step.
    fn product(dark: bool) -> Self {
        let ink = |light: f32, dark_alpha: f32| {
            if dark { hsla(0., 0., 1., dark_alpha) } else { hsla(0., 0., 0., light) }
        };
        let pick = |light: u32, dark_hex: u32| hex(if dark { dark_hex } else { light });

        Self {
            dark,
            surface_0: pick(0xf9f9f9, 0x0b0b0b),
            surface_1: pick(0xffffff, 0x191919),
            surface_2: pick(0xffffff, 0x1f1f1f),
            surface_popover: pick(0xffffff, 0x303030),
            text: ink(0.9, 0.93),
            text_secondary: ink(0.6, 0.57),
            text_muted: ink(0.47, 0.4),
            text_danger: pick(0xa42528, 0xf17778),
            border: ink(0.08, 0.04),
            border_line: ink(0.12, 0.12),
            fill_primary: pick(0x191919, 0xefefef),
            fill_primary_hover: pick(0x3c3c3c, 0xd7d7d7),
            on_primary: pick(0xffffff, 0x191919),
            fill_secondary: ink(0.05, 0.15),
            fill_secondary_hover: ink(0.08, 0.22),
            fill_hover: ink(0.05, 0.08),
            fill_selected: ink(0.1, 0.15),
            fill_card: ink(0.04, 0.03),
            fill_user_message: ink(0.05, 0.05),
            fill_brand: hex(0xc6613f),
            fill_brand_hover: hex(0xd97757),
            on_brand: hex(0xffffff),
        }
    }

    /// Warm slate ramp. The dark half is derived from the ramp.
    fn brand(dark: bool) -> Self {
        let pick = |light: u32, dark_hex: u32| hex(if dark { dark_hex } else { light });

        Self {
            dark,
            surface_0: pick(0xf5f4ed, 0x1f1e1d),
            surface_1: pick(0xfaf9f5, 0x262624),
            surface_2: pick(0xffffff, 0x30302e),
            surface_popover: pick(0xffffff, 0x30302e),
            text: pick(0x141413, 0xfaf9f5),
            text_secondary: pick(0x5e5d59, 0xc2c0b6),
            text_muted: pick(0x73726c, 0x9c9a92),
            text_danger: pick(0xbf4d43, 0xe8a083),
            border: pick(0xe8e6dc, 0x3d3d3a),
            border_line: pick(0xdedcd1, 0x4d4c48),
            fill_primary: pick(0x141413, 0xfaf9f5),
            fill_primary_hover: pick(0x3d3d3a, 0xe8e6dc),
            on_primary: pick(0xfaf9f5, 0x141413),
            fill_secondary: pick(0xf0eee6, 0x3d3d3a),
            fill_secondary_hover: pick(0xe8e6dc, 0x4d4c48),
            // Dark hover is translucent ivory so it never matches surface 2.
            fill_hover: if dark { rgba(0xfaf9f514).into() } else { hex(0xf0eee6) },
            fill_selected: pick(0xe8e6dc, 0x3d3d3a),
            fill_card: pick(0xf5f4ed, 0x30302e),
            fill_user_message: pick(0xf0eee6, 0x30302e),
            fill_brand: hex(0xc6613f),
            fill_brand_hover: hex(0xd97757),
            on_brand: hex(0xffffff),
        }
    }

    // Elevation is ring + contact shadow + ambient shadow. GPUI shadows cannot
    // be inset, so the ring is a 1px border in `self.border` set by the caller.
    // Dark shadows are several times stronger because the ground is dark too.

    pub fn shadow_card(&self) -> Vec<BoxShadow> {
        vec![shadow(0., 4., 24., if self.dark { 0.08 } else { 0.04 })]
    }

    pub fn shadow_sm(&self) -> Vec<BoxShadow> {
        vec![shadow(0., 1., 2., 0.06), shadow(0., 2., 8., if self.dark { 0.24 } else { 0.08 })]
    }

    pub fn shadow_popover(&self) -> Vec<BoxShadow> {
        vec![
            shadow(0., 2., 6., if self.dark { 0.2 } else { 0.08 }),
            shadow(0., 8., 24., if self.dark { 0.32 } else { 0.12 }),
        ]
    }
}

fn shadow(x: f32, y: f32, blur: f32, alpha: f32) -> BoxShadow {
    BoxShadow {
        color: hsla(0., 0., 0., alpha),
        offset: point(px(x), px(y)),
        blur_radius: px(blur),
        spread_radius: px(0.),
    }
}

/// The three voices. Each resolves to the first installed family in its list,
/// because GPUI's own fallback for a missing family is the system sans, which
/// would silently erase the Serif voice.
#[derive(Clone)]
pub struct Fonts {
    pub sans: SharedString,
    pub serif: SharedString,
    pub mono: SharedString,
}

impl Fonts {
    pub fn resolve(cx: &App) -> Self {
        let installed = cx.text_system().all_font_names();
        let first = |candidates: &[&'static str]| -> SharedString {
            candidates
                .iter()
                .find(|name| installed.iter().any(|font| font == *name))
                .copied()
                .unwrap_or(candidates[candidates.len() - 1])
                .into()
        };

        Self {
            sans: first(&["Anthropic Sans", ".SystemUIFont"]),
            serif: first(&["Anthropic Serif", "Source Serif 4", "Newsreader", "Charter", "Georgia"]),
            mono: first(&["Anthropic Mono", "JetBrains Mono", "Menlo", "Consolas"]),
        }
    }
}

/// Registers every .ttf and .otf in `dir` with GPUI. The Anthropic families are
/// proprietary: load them from a local install for your own use, and never ship
/// them inside your application.
pub fn load_fonts(dir: &str, cx: &App) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    let fonts = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| matches!(path.extension().and_then(|ext| ext.to_str()), Some("ttf" | "otf")))
        .filter_map(|path| std::fs::read(path).ok())
        .map(Cow::Owned)
        .collect();
    let _ = cx.text_system().add_fonts(fonts);
}

/// CSS `cubic-bezier()` as a GPUI easing function. GPUI ships only a handful of
/// easings, and the language's signature curves are not among them.
pub fn cubic_bezier(x1: f32, y1: f32, x2: f32, y2: f32) -> impl Fn(f32) -> f32 {
    let axis = |t: f32, p1: f32, p2: f32| {
        let u = 1. - t;
        3. * u * u * t * p1 + 3. * u * t * t * p2 + t * t * t
    };

    move |x| {
        // Bisect for the curve parameter whose x matches, then read off y.
        let (mut low, mut high) = (0., 1.);
        for _ in 0..20 {
            let mid = (low + high) / 2.;
            if axis(mid, x1, x2) < x { low = mid } else { high = mid }
        }
        axis((low + high) / 2., y1, y2)
    }
}

/// The default curve: fast start, long soft landing.
pub fn ease_snap() -> impl Fn(f32) -> f32 {
    cubic_bezier(0.32, 0.72, 0., 1.)
}

/// Entrances and fades (ease-out-quart).
pub fn ease_out() -> impl Fn(f32) -> f32 {
    cubic_bezier(0.165, 0.84, 0.44, 1.)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn easing_curves_start_at_zero_end_at_one_and_never_reverse() {
        for ease in [Box::new(ease_snap()) as Box<dyn Fn(f32) -> f32>, Box::new(ease_out())] {
            assert!(ease(0.).abs() < 1e-3);
            assert!((ease(1.) - 1.).abs() < 1e-3);
            let samples: Vec<f32> = (0..=100).map(|step| ease(step as f32 / 100.)).collect();
            assert!(samples.windows(2).all(|pair| pair[1] >= pair[0] - 1e-4));
        }
    }

    #[test]
    fn ease_out_is_ahead_of_linear_at_the_midpoint() {
        assert!(ease_out()(0.5) > 0.8);
    }
}
