# Verification Flow: Showcase & Theming (`showcase-and-theming`)

This verification guide validates the single-source design token system, theme presets, OKLCH palettes, and tactile elevation components on `/showcase`.

---

## Prerequisites

- Frontend server running at `http://localhost:3000`.

---

## Verification Steps

### 1. Route Navigation & SSR Render

1. Navigate to `http://localhost:3000/showcase` in a browser or fetch via curl:

   ```bash
   curl -s http://localhost:3000/showcase | grep -i "Design System Showcase"
   ```
2. **Assertion**: Page renders with HTTP 200 and displays the title "Design System Showcase".

### 2. Theme Preset Switching

1. Locate the `ThemeSwitcher` dropdown in the top-right header.
2. Select **`warm-tactile`** (Default):
   - **Assertion**: `<html>` element has `data-theme="warm-tactile"`.
   - **Visual Verification**: Primary actions display warm terracotta (`oklch(0.491 0.17 34.3)`), backgrounds are soft warm cream, and cards feature sharp offset physical shadows.
3. Select **`editorial-slate`**:
   - **Assertion**: `<html>` element has `data-theme="editorial-slate"`.
   - **Visual Verification**: Palette shifts to monochrome slate/graphite with subtle diffuse box-shadows (`--shadow-tactile: 0 1px 3px ...`).
4. Select **`neo-brutalist`**:
   - **Assertion**: `<html>` element has `data-theme="neo-brutalist"`.
   - **Visual Verification**: Palette shifts to high-contrast borders ($2\text{px}$ solid black), punchy accents, and hard $4\text{px}$ drop shadows.

### 3. Tactile Elevation Physics

1. Locate the interactive button primitives under the "Buttons & Tactile Elevation" section.
2. Hover over a button with class `interactive-tactile`:
   - **Assertion**: Button elevates with translate offset (`transform: translate(0px, -2px)`) and shadow increases to `--shadow-tactile-hover`.
3. Click and hold the button:
   - **Assertion**: Button depresses (`transform: translate(2px, 2px)`) and shadow collapses to `--shadow-tactile-active`.

### 4. Component Catalog Hygiene

1. Scroll through the component sections on `/showcase`:
   - **Typography**: Display headings, sans body, and mono code blocks render without missing font fallbacks.
   - **Surfaces**: Container hierarchy (`surface`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`) renders distinct steps.
   - **Form Primitives**: Input fields, textareas, checkboxes, and select dropdowns render with correct focus rings and labels.
   - **Feedback & Overlays**: Badges, alerts, tabs, tables, and dialog trigger modals cleanly without hydration mismatches.
