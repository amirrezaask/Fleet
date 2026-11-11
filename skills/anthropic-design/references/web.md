# Web

How to apply the language with CSS, Tailwind and React. The values live in
[tokens.css](../assets/web/tokens.css); a complete page built from them is
[example.html](../assets/web/example.html). Open the example in a browser before
writing anything, because it shows every rule at once.

## Setup

Copy `tokens.css` into the project and load it before any component styles. Every
token is a custom property prefixed `--ad-`. If the project already has a token
set, map its names onto these values instead of adding a second set.

```css
@import "./tokens.css";

body {
  margin: 0;
  background: var(--ad-surface-0);
  color: var(--ad-text);
  font: var(--ad-weight-regular) var(--ad-text-body) / var(--ad-leading-body) var(--ad-font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

## Mode and register

Colors use `light-dark()`, so they follow `color-scheme`. That needs Chrome 123,
Safari 17.5 or Firefox 120. For older targets, split each pair into a
`prefers-color-scheme` media query.

| Want | Markup |
| --- | --- |
| Follow the OS | Nothing. `:root` sets `color-scheme: light dark` |
| Force a mode | `data-mode="light"` or `data-mode="dark"` on any element |
| Brand register | `data-register="brand"` on any element |

Both attributes scope to a subtree, so a dark code panel inside a light page, or a
brand-register reading pane inside product chrome, is one attribute. Set the
register on a container that has its own surface; do not switch register between
siblings that share a background.

## Surfaces and elevation

Build these three before any component.

```css
.ground { background: var(--ad-surface-0); }

.page {
  background: var(--ad-surface-1);
  border-radius: var(--ad-radius-card);
  box-shadow: var(--ad-shadow-card);
}

.popover {
  background: var(--ad-surface-popover);
  border-radius: var(--ad-radius-lg);
  box-shadow: var(--ad-shadow-popover);
  padding: var(--ad-pad-xs);
}
```

The ring is part of the shadow token, so a raised element has no `border`. That
keeps the box size identical in both modes and lets the ring cross-fade when the
mode changes. Reach for `border` only for dividers, with `--ad-border-line`.

## Button

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ad-pad-xs);
  height: var(--ad-control);
  padding: 0 var(--ad-pad-md);
  border: 0;
  border-radius: var(--ad-radius);
  font: var(--ad-weight-control) var(--ad-text-body) / var(--ad-leading-body) var(--ad-font-sans);
  cursor: default;
  transition:
    background-color var(--ad-dur-fast) linear,
    scale var(--ad-dur-base) var(--ad-ease-spring);
}
.btn:active { scale: var(--ad-press-scale); }
.btn:disabled { opacity: var(--ad-opacity-disabled); pointer-events: none; }
.btn:focus-visible { outline: 0; box-shadow: var(--ad-shadow-focus); }

.btn-primary { background: var(--ad-fill-primary); color: var(--ad-on-primary); }
.btn-primary:hover { background: var(--ad-fill-primary-hover); }
.btn-secondary { background: var(--ad-fill-secondary); color: var(--ad-text); }
.btn-secondary:hover { background: var(--ad-fill-secondary-hover); }
.btn-ghost { background: transparent; color: var(--ad-text-secondary); }
.btn-ghost:hover { background: var(--ad-fill-hover); color: var(--ad-text); }
```

`cursor: default` is deliberate. In a desktop-style app, buttons keep the arrow and
only links get the pointer hand. On a brand-register web page, use `pointer`.

## Type

- Name the Anthropic family first, then a chosen substitute. The stacks in
  `tokens.css` fall back to the system sans, Source Serif 4 and the system mono. If
  the Serif substitute is not installed, load it as a web font; falling through to
  Georgia loses most of the character.
- The fractional weights (435, 520, 580) need a variable font. With a static
  substitute they round to 400, 500 and 600, which is acceptable. Do not
  compensate by going up to 700.
- Assistant prose, greetings and display text use `--ad-font-serif`. Everything
  else, including the user's own message, uses `--ad-font-sans`.
- White text on a dark ground looks heavier than black on white. The apps
  compensate by lowering the variable weight axis about 40 units in dark mode while
  leaving the CSS weight alone:

```css
[data-mode="dark"] .btn { font-variation-settings: "wght" 395; }
[data-mode="dark"] body { font-variation-settings: "wght" 360; }
```

  Apply this only when the variable Anthropic or another variable family is
  actually rendering; it does nothing for static fonts. To cover the automatic
  mode as well, repeat the rules inside `@media (prefers-color-scheme: dark)`.

## Motion

```css
.menu {
  transition: opacity var(--ad-dur-snap) var(--ad-ease-snap);
}
.menu[data-closing] {
  transition-duration: var(--ad-dur-fast);
}

@keyframes rise {
  from { opacity: 0; translate: 0 6px; }
}
.reply { animation: rise var(--ad-dur-sheet) var(--ad-ease-out) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

| Change | Duration | Curve |
| --- | --- | --- |
| Hover fill | `--ad-dur-fast` | linear |
| Menu, popover, selection, thumb | `--ad-dur-snap` | `--ad-ease-snap` |
| Content entering | `--ad-dur-sheet` | `--ad-ease-out` |
| Dialog or sheet | `--ad-dur-sheet` | `--ad-ease-snap` |
| Button press | `--ad-dur-base` | `--ad-ease-spring` |

Animate `opacity`, `translate` and `scale` only. Exits use the next duration down.
`--ad-ease-spring` is a `linear()` function (Chrome 113, Safari 17.2, Firefox 112);
where it is missing the transition falls back to `ease`, which is fine.

## Tailwind

With Tailwind 4, expose the tokens as theme variables so utilities read them. Keep
`tokens.css` as the source of truth and reference it; do not copy hex values into
the theme.

```css
@import "tailwindcss";
@import "./tokens.css";

@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));

@theme inline {
  --color-surface-0: var(--ad-surface-0);
  --color-surface-1: var(--ad-surface-1);
  --color-surface-2: var(--ad-surface-2);
  --color-popover: var(--ad-surface-popover);
  --color-ink: var(--ad-text);
  --color-ink-secondary: var(--ad-text-secondary);
  --color-ink-muted: var(--ad-text-muted);
  --color-line: var(--ad-border-line);
  --color-primary: var(--ad-fill-primary);
  --color-primary-hover: var(--ad-fill-primary-hover);
  --color-on-primary: var(--ad-on-primary);
  --color-secondary: var(--ad-fill-secondary);
  --color-secondary-hover: var(--ad-fill-secondary-hover);
  --color-hover: var(--ad-fill-hover);
  --color-selected: var(--ad-fill-selected);
  --color-clay: var(--ad-clay);
  --color-accent: var(--ad-accent);

  --font-sans: var(--ad-font-sans);
  --font-serif: var(--ad-font-serif);
  --font-mono: var(--ad-font-mono);

  --radius-xs: var(--ad-radius-xs);
  --radius-md: var(--ad-radius);
  --radius-lg: var(--ad-radius-lg);
  --radius-xl: var(--ad-radius-card);
  --radius-2xl: var(--ad-radius-composer);

  --shadow-card: var(--ad-shadow-card);
  --shadow-popover: var(--ad-shadow-popover);
  --shadow-focus: var(--ad-shadow-focus);

  --ease-snap: var(--ad-ease-snap);
  --ease-out: var(--ad-ease-out);
}
```

Because the colors already switch with `light-dark()`, components need no `dark:`
variants for color. Keep `dark:` for the rare structural difference.

Things to watch in Tailwind specifically:

- `text-sm` is 14 / 20, which matches the body. `text-[15px]/[21px]` is prose.
- Use arbitrary weights for the fractional steps: `font-[435]`, `font-[520]`.
- `rounded-full`, `shadow-lg`, `font-bold`, `uppercase` and `tracking-*` are almost
  always wrong here. So are the stock `gray-*`, `zinc-*` and `slate-*` palettes:
  use the ink roles so the color stays correct on every surface.

## React

A button with the same anatomy, using the theme above. The component owns variant
and size; callers do not pass color classes.

```tsx
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-secondary text-ink hover:bg-secondary-hover",
  ghost: "text-ink-secondary hover:bg-hover hover:text-ink",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex h-7 cursor-default items-center justify-center gap-1.5 rounded-md px-3 text-sm font-[435] transition-[background-color,scale] duration-[60ms] active:scale-[0.975] focus-visible:shadow-focus focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
```

The assistant's message is the other component worth getting exactly right: no
wrapper, no avatar, Serif prose at the reading measure.

```tsx
import type { ReactNode } from "react";

export function AssistantMessage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl font-serif text-[15px]/[21px] text-ink [&_code]:font-mono [&_code]:text-[13px]">
      {children}
    </div>
  );
}
```

With shadcn/ui or another component kit, restyle through its theme variables first
(map `--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--radius`
onto the tokens), then fix the heights and radii that the kit hardcodes: its 36px
controls become 28, its bordered cards become ring and shadow.

## Checks

- Toggle `data-mode` and `data-register` on `<html>`. Nothing should need a
  component-level override in any of the four combinations.
- Zoom to 200 percent. Sizes are in `rem`, so the layout should scale as a whole.
- Tab through the page. Every control shows the focus ring except the composer.
- Turn on reduced motion. State changes still happen, without travel.
