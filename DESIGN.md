---

name: Warm Tactile Studio
defaultPreset: warm-tactile
presets:

- warm-tactile
- editorial-slate
- neo-brutalist
  colors:
  background: '#fef8f4'
  foreground: '#1d1b19'
  surface: '#fef8f4'
  surface-dim: '#ded9d5'
  surface-bright: '#fef8f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2ef'
  surface-container: '#f3ede9'
  surface-container-high: '#ede7e3'
  surface-container-highest: '#e7e1de'
  on-surface: '#1d1b19'
  on-surface-variant: '#59413a'
  inverse-surface: '#32302e'
  inverse-on-surface: '#f5f0ec'
  outline: '#8d7168'
  outline-variant: '#e1bfb5'
  primary: '#a93201'
  primary-foreground: '#ffffff'
  primary-container: '#cb4a1b'
  on-primary-container: '#fffbff'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  secondary: '#3d6846'
  secondary-foreground: '#ffffff'
  secondary-container: '#bcebc0'
  on-secondary-container: '#416c4a'
  tertiary: '#715c00'
  tertiary-foreground: '#ffffff'
  tertiary-container: '#c7a938'
  on-tertiary-container: '#4d3e00'
  tertiary-fixed: '#ffe17a'
  destructive: '#ba1a1a'
  destructive-foreground: '#ffffff'
  destructive-container: '#ffdad6'
  on-destructive-container: '#93000a'
  success: '#3d6846'
  success-foreground: '#ffffff'
  success-container: '#bcebc0'
  on-success-container: '#416c4a'
  warning: '#715c00'
  warning-foreground: '#ffffff'
  warning-container: '#ffe17a'
  on-warning-container: '#4d3e00'
  info: '#1d669f'
  info-foreground: '#ffffff'
  info-container: '#d9ecff'
  on-info-container: '#0d3b61'
  typography:
  display-lg:
  fontFamily: Quicksand
  fontSize: 48px
  fontWeight: '700'
  lineHeight: 56px
  letterSpacing: -0.02em
  headline-xl:
  fontFamily: Quicksand
  fontSize: 40px
  fontWeight: '700'
  lineHeight: 48px
  letterSpacing: -0.02em
  headline-lg:
  fontFamily: Quicksand
  fontSize: 32px
  fontWeight: '700'
  lineHeight: 40px
  headline-md:
  fontFamily: Quicksand
  fontSize: 24px
  fontWeight: '600'
  lineHeight: 32px
  headline-sm:
  fontFamily: Quicksand
  fontSize: 20px
  fontWeight: '600'
  lineHeight: 28px
  title-md:
  fontFamily: Quicksand
  fontSize: 20px
  fontWeight: '600'
  lineHeight: 28px
  body-lg:
  fontFamily: Quicksand
  fontSize: 18px
  fontWeight: '500'
  lineHeight: 28px
  body-md:
  fontFamily: Quicksand
  fontSize: 16px
  fontWeight: '400'
  lineHeight: 24px
  body-sm:
  fontFamily: Quicksand
  fontSize: 14px
  fontWeight: '400'
  lineHeight: 20px
  label-lg:
  fontFamily: Quicksand
  fontSize: 14px
  fontWeight: '700'
  lineHeight: 16px
  letterSpacing: 0.05em
  label-md:
  fontFamily: Quicksand
  fontSize: 12px
  fontWeight: '600'
  lineHeight: 16px
  label-sm:
  fontFamily: Quicksand
  fontSize: 12px
  fontWeight: '700'
  lineHeight: 16px
  letterSpacing: 0.05em
  rounded:
  seed: 0.75rem
  xs: 0.25rem
  sm: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  2xl: 1.25rem
  3xl: 1.5rem
  4xl: 2rem
  full: 9999px
  spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px

---

# Design System Contract (`DESIGN.md` & `src/styles/theme.css`)

## Single-Source Theme Architecture

`tanstack-open-api` enforces a strict **Single-Source Theme Architecture** (`ADR-0006`):

1. **Layer 1 (`:root`, `.dark`, and `[data-theme="<preset>"]` in `src/styles/theme.css`)**: Holds all runtime `Design Token` values—OKLCH colors, surface container hierarchy, status pairs, chart/sidebar tokens, font families, base `--radius` seed, and tactile/diffuse shadow variables.
2. **Layer 2 (`@theme inline` & `@utility` in `src/styles/theme.css`)**: Binds every Layer 1 CSS custom property into Tailwind v4 utility classes (`bg-surface-container-low`, `text-on-surface-variant`, `border-outline-variant/40`, `text-headline-lg`, `shadow-tactile`, `interactive-tactile`).
3. **Zero Hardcoded Styles**: Components in `src/shared/ui/`, `src/features/`, and `src/routes/` MUST NEVER use arbitrary hex/rgb/hsl/oklch classes (`bg-[#...]`, `text-[#...]`), inline color/shadow style literals, or legacy `.chunky-shadow` classes. Enforced in CI by `src/shared/ui/__tests__/theme-hygiene.test.ts`.

## Brand, Aesthetic & Built-In Presets

The default visual personality is **Warm Tactile Studio (`warm-tactile`)**: an editorial, high-craft workspace combining warm parchment surfaces, organic rounded geometry (`--radius: 0.75rem`), and physical offset "tactile" interactions (`--shadow-tactile`) that lift on hover and press cleanly on click.

To prove and demonstrate single-change restyling, `src/styles/theme.css` ships three built-in `Theme Preset`s selectable via `data-theme="<preset>"` on `<html>` (and persisted alongside `"system" | "light" | "dark"` mode via `src/shared/lib/theme.ts`):

- **`warm-tactile` (Default)**: Warm parchment canvas (`#fef8f4`), terracotta primary (`#a93201`), sage green secondary (`#3d6846`), maize tertiary (`#715c00`), `Quicksand` + `JetBrains Mono`, `--radius: 0.75rem`, and `4px`/`6px` offset tactile shadows (`-2px` hover lift, `+2px` active press).
- **`editorial-slate` (Minimal SaaS)**: Cool slate canvas, indigo primary, emerald secondary, `Plus Jakarta Sans` + `JetBrains Mono`, `--radius: 0.5rem`, and diffuse SaaS shadows (`0px` tactile translate offsets).
- **`neo-brutalist` (High-Contrast Studio)**: Crisp paper/ink canvas, cobalt primary, citron accent, `--radius: 0.25rem`, and hard `4px`/`6px` solid offset shadows.

## Colors & Surface Hierarchy

Components compose depth and emphasis through semantic surface tiers rather than raw color values:

- **Background / Canvas (`bg-background` / `bg-surface`)**: Warm parchment (`#fef8f4` in light, deep charcoal in dark) reducing eye strain across full-viewport layouts.
- **Surface Container Hierarchy (`bg-surface-container-lowest` → `highest`)**:
  - `surface-container-lowest` (`#ffffff` light / elevated dark): Primary cards (`bg-card`), popovers (`bg-popover`), and form inputs.
  - `surface-container-low` (`#f8f2ef`): App sidebar (`bg-sidebar`), secondary panels, and completed item rows.
  - `surface-container` (`#f3ede9`): Muted pills (`bg-muted`), subtle code/metric blocks, and hover containers.
  - `surface-container-high` & `highest` (`#ede7e3` / `#e7e1de`): Active filter chips, table headers, and nested wells.
- **Primary (`bg-primary`, `text-primary`, `bg-primary-container`, `text-on-primary-container`)**: Primary CTAs, active navigation indicators, focus rings (`ring-ring`), and key highlights.
- **Secondary (`bg-secondary`, `bg-secondary-container`, `text-on-secondary-container`)**: Completed states, interactive checkboxes, secondary actions, and resource scope badges.
- **Tertiary (`bg-tertiary`, `bg-tertiary-container`, `text-on-tertiary-container`, `bg-tertiary-fixed`)**: Highlights, featured callouts, and accent badges.
- **Status Tokens (`destructive`, `success`, `warning`, `info`)**: Every status provides `<status>`, `<status>-foreground`, `<status>-container`, and `on-<status>-container` tokens. Always pair status colors with `lucide-react` iconography and text labels (never color alone).
- **Text & Outlines (`text-foreground` / `text-on-surface`, `text-muted-foreground` / `text-on-surface-variant`, `border-outline`, `border-outline-variant/40`)**: High-contrast primary copy (`>= 4.5:1`), warm muted metadata, and subtle structural borders.

## Typography & Iconography

- **Font Families**:
  - `--font-sans` (`font-sans`) & `--font-display` (`font-display`): `Quicksand` (`400`, `500`, `600`, `700`) in `warm-tactile`, switching automatically to `Plus Jakarta Sans` in `editorial-slate`.
  - `--font-mono` (`font-mono`): `JetBrains Mono` for request IDs, trace IDs, SSE event logs, file sizes/hashes, and code snippets.
- **Semantic Typography Utilities (defined in `@theme inline`)**:
  - **Display & Headlines (`text-display-lg`, `text-headline-xl`, `text-headline-lg`, `text-headline-md`, `text-headline-sm`, `text-title-md`)**: Bold/semi-bold with tight editorial tracking (`-0.02em` on display/XL).
  - **Body (`text-body-lg`, `text-body-md`, `text-body-sm`)**: Effortless reading rhythm (`1.5`–`1.55` line height).
  - **Labels (`text-label-lg`, `text-label-md`, `text-label-sm`)**: Semi-bold/bold metadata, badges, and table headers (`0.05em` letter-spacing when paired with `uppercase`).
- **Iconography**: Exclusively uses **`lucide-react`** across all `shadcn/ui` primitives and feature slices, sized consistently (`size-4` inline, `size-5` navigation/cards) and inheriting `currentColor`.

## Elevation, Tactile Shadows & Dark Mode

- **Tactile Utilities (`@utility` in `src/styles/theme.css`)**:
  - `shadow-tactile`: Static offset shadow (`var(--shadow-tactile)`) for elevated cards and containers.
  - `interactive-tactile`: Interactive elevation with smooth `0.15s cubic-bezier(0.2, 0, 0, 1)` transition that lifts on `:hover:not(:disabled)` (`var(--shadow-tactile-hover)` + `translate(var(--tactile-hover-translate-x), var(--tactile-hover-translate-y))`) and presses into the surface on `:active:not(:disabled)` (`var(--shadow-tactile-active)` + `translate(var(--tactile-active-translate-x), var(--tactile-active-translate-y))`).
  - `shadow-(--inset-shadow-input)`: Subtle inset depth on text inputs, textareas, and select triggers.
- **Native Browser UI & Dark Mode**:
  - `<meta name="color-scheme" content="light dark">` in `<head>` + `color-scheme: light` on `:root` and `color-scheme: dark` on `.dark` (with `accent-color: var(--primary)`) keep browser scrollbars, form controls, and viewport canvas synchronized.
  - A synchronous inline `<script>` in `src/routes/__root.tsx` applies stored `theme-mode` (`"system" | "light" | "dark"`) and `theme-preset` before first paint to prevent FOUC.

## Core Component & Layout Specifications

- **App Shell & Top Navigation (`src/shared/ui/`)**: Sticky top bar (`z-50`, `bg-surface/90 backdrop-blur-md border-b border-outline-variant/40`), `max-w-7xl` container, active route links styled with `border-b-2 border-primary text-foreground font-semibold`, accompanied by the theme preset/mode switcher and `<UserMenu />` slot.
- **Buttons (`src/shared/ui/button.tsx`)**:
  - `default`: `bg-primary text-primary-foreground rounded-xl font-bold interactive-tactile hover:bg-primary-container`
  - `secondary`: `bg-secondary-container text-on-secondary-container rounded-xl font-semibold hover:bg-secondary-container/80`
  - `outline`: `border border-outline-variant/60 bg-surface-container-lowest text-foreground rounded-xl interactive-tactile hover:bg-surface-container`
  - `destructive`: `bg-destructive text-destructive-foreground rounded-xl font-bold interactive-tactile hover:bg-destructive/90`
- **Cards (`src/shared/ui/card.tsx`)**: `rounded-2xl border border-outline-variant/40 bg-card text-card-foreground shadow-tactile` (never `rounded-none`).
- **Inputs & Form Controls (`src/shared/ui/input.tsx`, `textarea.tsx`, `select.tsx`)**: `rounded-xl border border-input bg-surface-container-lowest text-foreground shadow-(--inset-shadow-input) focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25`.
- **Interactive Checkboxes & Task Rows**: `border-2 border-outline rounded-lg data-checked:bg-secondary data-checked:border-secondary data-checked:text-secondary-foreground`; completed task cards shift to `bg-surface-container-low border-secondary-container` with `line-through decoration-primary`.
- **Live SSE Status & File Dropzones**:
  - Live connection badge uses semantic status containers (`bg-success-container text-on-success-container` when `"connected"`, `bg-warning-container text-on-warning-container` when `"connecting"`, `bg-destructive-container text-on-destructive-container` when `"error"`).
  - File upload dropzone uses `rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low hover:border-primary hover:bg-surface-container transition-colors`.
- **Bento Showcase Grid**: Responsive 1/2/3-column grid (`rounded-3xl p-6 bg-card border border-outline-variant/40 shadow-tactile`) demonstrating live theme preset switching, color tokens, typography scale, form controls, charts, overlays, and feedback states.
