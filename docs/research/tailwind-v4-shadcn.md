# Tailwind CSS v4 Single-Source Theme Architecture & Complete `shadcn/ui` Registry Inventory

> **Research Ticket:** [Guiguerreiro39/tanstack-open-api#4](https://github.com/Guiguerreiro39/tanstack-open-api/issues/4)  
> **Parent Wayfinder Map:** [Guiguerreiro39/tanstack-open-api#1](https://github.com/Guiguerreiro39/tanstack-open-api/issues/1)  
> **Primary Sources Consulted:**
> - Official `shadcn/ui` Registry API (`https://ui.shadcn.com/r/index.json` and `https://ui.shadcn.com/r/styles/new-york-v4/<component>.json`) & `@shadcn` MCP Server (`list_items_in_registries`)
> - `shadcn` v3.6.2 package distribution (`node_modules/shadcn/dist/tailwind.css`)
> - Tailwind CSS v4.1.3 theme specification (`node_modules/tailwindcss/theme.css`)
> - `forklore-fe` Design System & Source Code (`DESIGN.md`, `components.json`, `src/index.css`, `src/shared/ui/*`, `src/routes/*`, `src/features/*`)

---

## Executive Summary

1. **Complete `shadcn/ui` Registry Inventory (Tailwind v4 + React 19):** The official `@shadcn` registry currently exposes **62 items** via the CLI/MCP (`61` `registry:ui` components + `1` `registry:hook` `use-mobile`), plus 4 additional items in `r/index.json` (`code-block`, `questionnaire`, `toast`, `trace`, totaling **65 registry entries**). In the `new-york-v4` style targeting React 19 and Tailwind v4, Radix primitives are consolidated under the unified `radix-ui` package (while remaining compatible with individual `@radix-ui/react-*` packages), components annotate DOM nodes with `data-slot="..."` instead of `React.forwardRef`, and `@import "shadcn/tailwind.css"` registers data-attribute custom variants (`data-open:`, `data-closed:`, `data-checked:`, `data-active:`, etc.).
2. **Why `forklore-fe` Currently Leaks Hardcoded Styles:** A codebase audit of `forklore-fe` uncovered **110+ hardcoded hex class occurrences** across 9 component files (`bg-[#fff8f3]`, `text-[#9f3c16]`, `border-[#dec0b7]/40`, `bg-[#f9f2ed]`, `text-[#57423b]`, `bg-[#436558]`) and **3-way token drift** between `DESIGN.md` (`#fef8f4` surface, `#a93201` primary, `Quicksand`), `src/index.css` (`#fff8f3` background, `#9f3c16` primary, `"Inter Variable"`), and `src/routes/__root.tsx` (loads `Newsreader`, `Plus Jakarta Sans`, and `Quicksand` while hardcoding `<body className="bg-[#fff8f3] text-[#1d1b18]">`). Furthermore, `--surface*` and `--on-surface*` variables in `:root` are omitted from `@theme inline` and `.dark`, preventing Tailwind v4 from generating `bg-surface-container` or `text-on-surface-variant` utilities.
3. **Single-File Themeable Architecture:** By separating **Layer 1: Runtime Semantic Variables (`:root` and `.dark`)** from **Layer 2: Tailwind v4 Utility Compiler Mapping (`@theme inline` + `@utility`)** inside a single `src/styles/theme.css` imported by `src/index.css`, changing one file restyles every `shadcn/ui` primitive and page layout—including colors, surface container hierarchy, status tokens, font families, typography scale, border radii, and switching between chunky neo-brutalist offset shadows and diffuse SaaS shadows.

---

## Part 1: Complete `shadcn/ui` Component Registry Inventory (`new-york-v4` / React 19)

### 1.1 Architectural Changes in `shadcn/ui` for Tailwind v4 & React 19

Inspection of `node_modules/shadcn/dist/tailwind.css`, `forklore-fe/src/shared/ui/*`, and `https://ui.shadcn.com/r/styles/new-york-v4/*.json` establishes four foundational conventions for `shadcn/ui` on React 19 + Tailwind v4:

- **No `React.forwardRef`:** React 19 passes `ref` as a standard prop (`React.ComponentProps<"button">`, `React.ComponentProps<typeof Primitive.Root>`). Every component in `new-york-v4` is a plain function component.
- **`data-slot` Instrumentation:** Every primitive root and sub-component sets `data-slot="<slot-name>"` (e.g., `data-slot="card"`, `data-slot="card-header"`, `data-slot="button"`). Parent components style or query children deterministically using Tailwind v4 `has-data-[slot=card-action]:...` and `*:data-[slot=...]:...` selectors (`src/shared/ui/card.tsx#L13-L27`).
- **Unified `radix-ui` vs Scoped `@radix-ui/react-*` Packages:** Upstream `new-york-v4` registry manifests declare `"dependencies": ["radix-ui"]` (the unified `radix-ui` package v1.4+) alongside `@base-ui/react` for `combobox`. When `npx shadcn@latest add` runs against a project using scoped `@radix-ui/react-*` packages, or if the unified `radix-ui` package is installed, imports resolve cleanly.
- **`@import "shadcn/tailwind.css"` Custom Variants (`node_modules/shadcn/dist/tailwind.css#L1-L95`):**
  - Keyframes: `accordion-down`, `accordion-up` inside `@theme inline`.
  - State variants: `@custom-variant data-open`, `data-closed`, `data-checked`, `data-unchecked`, `data-selected`, `data-disabled`, `data-active`, `data-horizontal`, `data-vertical`.
  - Utility: `@utility no-scrollbar`.

> [!WARNING]
> **`components.json` Alias Mismatch in `forklore-fe`:**  
> `forklore-fe/components.json` currently configures `"ui": "@/components/ui"` and `"utils": "@/lib/utils"`, whereas the repository stores components in `src/shared/ui/` and `cn()` in `src/shared/lib/utils.ts`. Before running `npx shadcn@latest add <component>`, `components.json` must be aligned to:
> ```json
> "aliases": {
>   "components": "@/shared",
>   "utils": "@/shared/lib/utils",
>   "ui": "@/shared/ui",
>   "lib": "@/shared/lib",
>   "hooks": "@/shared/lib/hooks"
> }
> ```

---

### 1.2 Complete Registry Catalog by Functional Category

Data below is cross-referenced directly from `@shadcn` MCP (`list_items_in_registries`, 62 items) and `https://ui.shadcn.com/r/styles/new-york-v4/<name>.json` + `https://ui.shadcn.com/r/index.json` (65 items total).

#### A. Core Actions & Inline Primitives (7 components)

| Registry Name  | Type          | NPM Peer Dependencies (`new-york-v4`)                              | Registry Dependencies | React 19 / Tailwind v4 Notes                                                             |
| :------------- | :------------ | :----------------------------------------------------------------- | :-------------------- | :--------------------------------------------------------------------------------------- |
| `button`       | `registry:ui` | `radix-ui` (or `@radix-ui/react-slot`), `class-variance-authority` | —                     | Installed in `forklore-fe` (`src/shared/ui/button.tsx`). Uses `Slot` for `asChild`.      |
| `button-group` | `registry:ui` | `radix-ui`                                                         | `button`, `separator` | New in v4 registry; groups buttons with shared borders/radii via `*:data-[slot=button]`. |
| `badge`        | `registry:ui` | `radix-ui`, `class-variance-authority`                             | —                     | Supports `asChild` via `Slot`; ideal for recipe dietary/status tags.                     |
| `toggle`       | `registry:ui` | `radix-ui`, `class-variance-authority`                             | —                     | Two-state press button (`data-[state=on]`).                                              |
| `toggle-group` | `registry:ui` | `radix-ui`                                                         | `toggle`              | Single or multiple toggle bar (`Unit: Metric / Imperial` switcher).                      |
| `kbd`          | `registry:ui` | —                                                                  | —                     | Semantic `<kbd>` shortcut keycap component (`⌘K`).                                       |
| `spinner`      | `registry:ui` | `class-variance-authority`                                         | —                     | Official accessible SVG loading spinner replacing custom `loader.tsx`.                   |

#### B. Layout, Surfaces & Containers (8 components)

| Registry Name  | Type          | NPM Peer Dependencies (`new-york-v4`) | Registry Dependencies | React 19 / Tailwind v4 Notes                                                                               |
| :------------- | :------------ | :------------------------------------ | :-------------------- | :--------------------------------------------------------------------------------------------------------- |
| `card`         | `registry:ui` | —                                     | —                     | Installed in `forklore-fe` (`src/shared/ui/card.tsx`). Includes `CardAction` and `@container/card-header`. |
| `separator`    | `registry:ui` | `radix-ui`                            | —                     | Horizontal/vertical divider using `bg-border`.                                                             |
| `aspect-ratio` | `registry:ui` | `radix-ui`                            | —                     | Preserves media aspect ratios (`9/16` reel container, `16/9` video).                                       |
| `resizable`    | `registry:ui` | `react-resizable-panels@^4`           | —                     | Split-pane resizable layout (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`).                  |
| `scroll-area`  | `registry:ui` | `radix-ui`                            | —                     | Custom cross-browser scrollbars for ingredient lists or transcripts.                                       |
| `collapsible`  | `registry:ui` | `radix-ui`                            | —                     | Expand/collapse primitive (`CollapsibleTrigger`, `CollapsibleContent`).                                    |
| `accordion`    | `registry:ui` | `radix-ui`                            | —                     | Uses `accordion-down`/`accordion-up` keyframes from `shadcn/tailwind.css`.                                 |
| `direction`    | `registry:ui` | `@base-ui/react` / `radix-ui`         | —                     | LTR/RTL direction provider wrapper.                                                                        |

#### C. Navigation & Application Chrome (6 components)

| Registry Name     | Type          | NPM Peer Dependencies (`new-york-v4`)                  | Registry Dependencies                                                        | React 19 / Tailwind v4 Notes                                                  |
| :---------------- | :------------ | :----------------------------------------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| `sidebar`         | `registry:ui` | `radix-ui`, `class-variance-authority`, `lucide-react` | `button`, `separator`, `sheet`, `tooltip`, `input`, `use-mobile`, `skeleton` | Full collapsible app shell driven by `--sidebar-*` theme tokens.              |
| `navigation-menu` | `registry:ui` | `radix-ui`                                             | —                                                                            | Top-level header navigation with animated viewport popovers.                  |
| `menubar`         | `registry:ui` | `radix-ui`                                             | `dropdown-menu`                                                              | Desktop application menu bar.                                                 |
| `breadcrumb`      | `registry:ui` | `radix-ui`                                             | —                                                                            | Composable trail (`BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbSeparator`). |
| `tabs`            | `registry:ui` | `radix-ui`                                             | —                                                                            | Tabbed interface (`TabsList`, `TabsTrigger`, `TabsContent`).                  |
| `pagination`      | `registry:ui` | —                                                      | `button`                                                                     | Link-based pagination compatible with TanStack Router `<Link>`.               |

#### D. Forms, Inputs & Selection Controls (15 components)

| Registry Name   | Type          | NPM Peer Dependencies (`new-york-v4`)                       | Registry Dependencies         | React 19 / Tailwind v4 Notes                                                                                                                |
| :-------------- | :------------ | :---------------------------------------------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `field`         | `registry:ui` | `class-variance-authority`                                  | `label`, `separator`          | **Preferred for TanStack Form:** Schema-library-agnostic `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`. |
| `form`          | `registry:ui` | `radix-ui`, `react-hook-form`, `@hookform/resolvers`, `zod` | `button`, `label`             | Coupled to `react-hook-form`. Since `forklore-fe` uses `@tanstack/react-form` + `effect/Schema`, prefer `field` over `form`.                |
| `label`         | `registry:ui` | `radix-ui`                                                  | —                             | Installed in `forklore-fe` (`src/shared/ui/label.tsx`).                                                                                     |
| `input`         | `registry:ui` | —                                                           | —                             | Installed in `forklore-fe` (`src/shared/ui/input.tsx`).                                                                                     |
| `input-group`   | `registry:ui` | —                                                           | `button`, `input`, `textarea` | Composable input with prefix/suffix addons & inline action buttons (ideal for Reel URL extractor bar).                                      |
| `input-otp`     | `registry:ui` | `input-otp`                                                 | —                             | One-time passcode segmented input (`input-otp` v1.4+ supports React 19).                                                                    |
| `textarea`      | `registry:ui` | —                                                           | —                             | Auto-sizing capable multi-line text input (`field-sizing-content`).                                                                         |
| `checkbox`      | `registry:ui` | `radix-ui`                                                  | —                             | Installed in `forklore-fe` (`src/shared/ui/checkbox.tsx`).                                                                                  |
| `radio-group`   | `registry:ui` | `radix-ui`                                                  | —                             | Single-choice radio buttons.                                                                                                                |
| `switch`        | `registry:ui` | `radix-ui`                                                  | —                             | Toggle switch control.                                                                                                                      |
| `slider`        | `registry:ui` | `radix-ui`                                                  | —                             | Range/scrubbing slider (ideal for audio/video seek bar or serving scaler).                                                                  |
| `select`        | `registry:ui` | `radix-ui`                                                  | —                             | Custom popover select menu.                                                                                                                 |
| `native-select` | `registry:ui` | —                                                           | —                             | Styled native `<select>` element for mobile/SSR ergonomics.                                                                                 |
| `combobox`      | `registry:ui` | `@base-ui/react`                                            | `button`, `input-group`       | Autocomplete / searchable select powered by `@base-ui/react` in `new-york-v4` (or `popover` + `command`).                                   |
| `calendar`      | `registry:ui` | `react-day-picker@latest`, `date-fns`                       | `button`                      | Uses `react-day-picker` v9 (`@latest`), which has native React 19 support. Pair with `popover` for Date Picker.                             |

#### E. Overlays, Dialogs & Contextual Menus (10 components)

| Registry Name   | Type          | NPM Peer Dependencies (`new-york-v4`) | Registry Dependencies   | React 19 / Tailwind v4 Notes                                           |
| :-------------- | :------------ | :------------------------------------ | :---------------------- | :--------------------------------------------------------------------- |
| `dialog`        | `registry:ui` | `radix-ui`                            | `button`                | Modal dialog overlay.                                                  |
| `alert-dialog`  | `registry:ui` | `radix-ui`                            | `button`                | Interruptive confirmation modal (e.g., delete recipe confirmation).    |
| `sheet`         | `registry:ui` | `radix-ui`                            | `button`                | Side-docked drawer (`top`, `right`, `bottom`, `left`) built on Dialog. |
| `drawer`        | `registry:ui` | `vaul` (or `@base-ui/react`)          | —                       | Touch-draggable bottom drawer (`vaul` v1.1+ for React 19).             |
| `popover`       | `registry:ui` | `radix-ui`                            | —                       | Floating anchored content panel.                                       |
| `hover-card`    | `registry:ui` | `radix-ui`                            | —                       | Hover-triggered preview card (e.g., ingredient substitution preview).  |
| `tooltip`       | `registry:ui` | `radix-ui`                            | —                       | Accessible hover/focus tooltip (`TooltipProvider` integrated in v4).   |
| `dropdown-menu` | `registry:ui` | `radix-ui`                            | —                       | Installed in `forklore-fe` (`src/shared/ui/dropdown-menu.tsx`).        |
| `context-menu`  | `registry:ui` | `radix-ui`                            | —                       | Right-click / long-press menu.                                         |
| `command`       | `registry:ui` | `cmdk`                                | `dialog`, `input-group` | Command palette (`⌘K`) and filterable list (`cmdk` v1.1+).             |

#### F. Feedback, Status & Empty States (5 components + 1 legacy index item)

| Registry Name      | Type          | NPM Peer Dependencies (`new-york-v4`) | Registry Dependencies | React 19 / Tailwind v4 Notes                                                                                     |
| :----------------- | :------------ | :------------------------------------ | :-------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `alert`            | `registry:ui` | `class-variance-authority`            | —                     | Inline callout banner (`AlertTitle`, `AlertDescription`).                                                        |
| `sonner`           | `registry:ui` | `sonner`, `next-themes`               | —                     | Installed in `forklore-fe` (`src/shared/ui/sonner.tsx`).                                                         |
| `progress`         | `registry:ui` | `radix-ui`                            | —                     | Determinate progress bar (e.g., reel extraction progress).                                                       |
| `skeleton`         | `registry:ui` | —                                     | —                     | Installed in `forklore-fe` (`src/shared/ui/skeleton.tsx`).                                                       |
| `empty`            | `registry:ui` | —                                     | —                     | Structured empty state (`Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`). |
| `toast` _(legacy)_ | `registry:ui` | `@base-ui/react` / `radix-ui`         | `button`              | Present in `r/index.json` only (not in `new-york-v4`); superseded by `sonner`.                                   |

#### G. Data Display, Lists, Media & Charts (5 components)

| Registry Name | Type          | NPM Peer Dependencies (`new-york-v4`)  | Registry Dependencies | React 19 / Tailwind v4 Notes                                                                                                                                                                 |
| :------------ | :------------ | :------------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table`       | `registry:ui` | —                                      | —                     | Responsive semantic HTML table wrappers (`TableHeader`, `TableBody`, `TableRow`, `TableCell`). Pair with `@tanstack/react-table` for Data Tables.                                            |
| `item`        | `registry:ui` | `radix-ui`, `class-variance-authority` | `separator`           | Structured list row (`Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`)—ideal for ingredient rows & step cards.                                              |
| `avatar`      | `registry:ui` | `radix-ui`                             | —                     | User avatar with image & fallback initials (replaces custom span in `user-menu.tsx`).                                                                                                        |
| `carousel`    | `registry:ui` | `embla-carousel-react`                 | `button`              | Touch/keyboard carousel (`embla-carousel-react` v8.5+ supports React 19).                                                                                                                    |
| `chart`       | `registry:ui` | `recharts@3.8.0`, `lucide-react`       | `card`                | Uses **`recharts@3.8.0`** in `new-york-v4` (`ChartContainer`, `ChartTooltip`, `ChartLegend`), resolving Recharts 2's React 19 `react-is` peer dependency conflict. Driven by `--chart-1..5`. |

#### H. Conversational / AI & Rich Content Primitives (5 `new-york-v4` + 3 `index.json` components)

| Registry Name      | Type          | NPM Peer Dependencies (`new-york-v4`) | Registry Dependencies            | React 19 / Tailwind v4 Notes                           |
| :----------------- | :------------ | :------------------------------------ | :------------------------------- | :----------------------------------------------------- |
| `message`          | `registry:ui` | —                                     | —                                | Chat/assistant message container (`@shadcn` registry). |
| `message-scroller` | `registry:ui` | `@shadcn/react`                       | `button`                         | Auto-scrolling message stream container.               |
| `bubble`           | `registry:ui` | `radix-ui`                            | —                                | Chat bubble primitive.                                 |
| `attachment`       | `registry:ui` | `radix-ui`                            | `button`                         | Media/file attachment chip.                            |
| `marker`           | `registry:ui` | `radix-ui`                            | —                                | Annotated timeline/text marker.                        |
| `code-block`       | `registry:ui` | —                                     | `button`, `use-highlighted-code` | Present in `r/index.json` (not in `new-york-v4`).      |
| `questionnaire`    | `registry:ui` | `@shadcn/react`                       | `button`                         | Present in `r/index.json` (not in `new-york-v4`).      |
| `trace`            | `registry:ui` | —                                     | `collapsible`                    | Present in `r/index.json` (not in `new-york-v4`).      |

#### I. Official Registry Hooks (1 hook)

| Registry Name | Type            | NPM Peer Dependencies (`new-york-v4`) | Registry Dependencies | React 19 / Tailwind v4 Notes                                                 |
| :------------ | :-------------- | :------------------------------------ | :-------------------- | :--------------------------------------------------------------------------- |
| `use-mobile`  | `registry:hook` | —                                     | —                     | `useIsMobile()` matchMedia hook (`768px` breakpoint), required by `sidebar`. |

---

## Part 2: Audit of Theme Leaks & Token Drift in `forklore-fe`

### 2.1 Three-Way Token Drift (`DESIGN.md` vs `src/index.css` vs `src/routes/__root.tsx`)

Inspecting the repository reveals that `DESIGN.md`, `src/index.css`, and `src/routes/__root.tsx` define three conflicting versions of the "Kitchen Playbook" palette and typography:

| Token Concept            | `DESIGN.md` Spec (`L3-L120`)                                                                                 | `src/index.css` (`L5-L127`)                                                                                                                                      | `src/routes/__root.tsx` & Components                                                                                                                                           |
| :----------------------- | :----------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Background / Surface** | `#fef8f4` (`surface` / `background`)                                                                         | `--background: #fff8f3;`<br>`--surface: #fff8f3;`                                                                                                                | `<body className="bg-[#fff8f3] text-[#1d1b18]">` (`__root.tsx#L70`)                                                                                                            |
| **Primary (Terracotta)** | `#a93201` (`primary`)<br>`#cb4a1b` (`primary-container`)                                                     | `--primary: #9f3c16;`                                                                                                                                            | `bg-[#9f3c16] hover:bg-[#bf542c]` (`sign-in-form.tsx#L129`)                                                                                                                    |
| **Secondary (Sage)**     | `#3d6846` (`secondary`)<br>`#bcebc0` (`secondary-container`)                                                 | `--secondary: #436558;`<br>`--accent: #c2e8d7;`                                                                                                                  | `bg-[#436558]` (`ingredients-checklist.tsx#L99`)<br>`bg-[#c2e8d7] text-[#476a5c]` (`recipe-stepper.tsx#L119`)                                                                  |
| **Tertiary (Maize)**     | `#715c00` (`tertiary`)<br>`#c7a938` (`tertiary-container`)<br>`#ffe17a` (`tertiary-fixed`)                   | _Completely missing_                                                                                                                                             | _Unusable via semantic classes_                                                                                                                                                |
| **Surface Containers**   | `lowest`: `#ffffff`<br>`low`: `#f8f2ef`<br>`DEFAULT`: `#f3ede9`<br>`high`: `#ede7e3`<br>`highest`: `#e7e1de` | `--surface-low: #f9f2ed;` _(not in `@theme`)_<br>`--surface-container: #f3ede7;` _(not in `@theme`)_<br>`--surface-container-high: #ede7e2;` _(not in `@theme`)_ | Hardcoded `bg-[#f9f2ed]`, `bg-[#f3ede7]`, `hover:bg-[#ede7e2]` across 6 files                                                                                                  |
| **Outlines / Borders**   | `outline`: `#8d7168`<br>`outline-variant`: `#e1bfb5`                                                         | `--border: #dec0b7;`                                                                                                                                             | Hardcoded `border-[#dec0b7]/40`, `border-[#dec0b7]/60` across 8 files                                                                                                          |
| **Typography**           | Exclusively `Quicksand` (`500`/`600`/`700`)                                                                  | `--font-sans: "Inter Variable", sans-serif;` (`L88`)                                                                                                             | Loads `Newsreader`, `Plus Jakarta Sans`, `Quicksand` (`__root.tsx#L45`); uses `font-serif` (`header.tsx#L19`, `recipe-workspace.tsx#L659`) which falls back to system Georgia! |
| **Base Radius**          | `sm`: `0.25rem`, `md`: `0.5rem`, `xl`: `0.75rem`, `2xl`: `1rem`, `3xl`: `1.5rem`                             | `--radius: 0.75rem;` (`rounded-none` hardcoded inside `src/shared/ui/card.tsx#L13`!)                                                                             | Components manually override with `rounded-xl` and `rounded-2xl`                                                                                                               |
| **Shadows**              | Chunky offset shadows (`4px 4px 0`, `6px 6px 0`, `0px 0px 0`)                                                | Hardcoded `.chunky-shadow` class outside `@theme` (`L34-L51`)                                                                                                    | Mixes `shadow-xs`, `shadow-sm`, and `.chunky-shadow`                                                                                                                           |

### 2.2 Complete Inventory of Hardcoded Hex Leaks in `forklore-fe/src`

Because `--surface-*`, `--on-surface-*`, and `--primary-container` were never registered inside `@theme inline` in `src/index.css`, developers bypassed Tailwind's theme layer in **9 files (110+ occurrences)**:

1. `src/routes/__root.tsx` (`L70`): `bg-[#fff8f3] text-[#1d1b18]` on `<body>`.
2. `src/routes/login.tsx` (`L36-L37`): `bg-[#fff8f3]`, `border-[#dec0b7]/40`.
3. `src/components/header.tsx` (`L9-L38`): `bg-[#fff8f3]/90`, `border-[#dec0b7]/40`, `text-[#1d1b18]`, `group-hover:text-[#9f3c16]`, `bg-[#dec0b7]`, `text-[#57423b]`, `bg-[#f3ede7]`, `bg-[#9f3c16]`, `hover:bg-[#bf542c]`.
4. `src/features/auth/ui/sign-in-form.tsx` (`L51-L141`): `text-[#1d1b18]`, `text-[#57423b]`, `border-[#dec0b7]/60`, `focus:border-[#9f3c16]`, `bg-[#9f3c16]`, `hover:bg-[#bf542c]`, `hover:text-[#cb4a1b]`.
5. `src/features/auth/ui/sign-up-form.tsx` (`L53-L172`): Same 9 hex leaks as `sign-in-form.tsx`.
6. `src/features/auth/ui/user-menu.tsx` (`L22-L47`): `border-[#dec0b7]/60`, `hover:bg-[#f3ede7]`, `text-[#1d1b18]`, `bg-[#9f3c16]`, `text-[#57423b]`, `border-[#dec0b7]/40`, `bg-[#dec0b7]/30`.
7. `src/features/recipes/ui/recipe-extractor-hero.tsx` (`L29-L79`): `bg-[#f9f2ed]`, `border-[#dec0b7]/30`, `border-[#dec0b7]/40`, `focus-within:border-[#9f3c16]`, `text-[#9f3c16]`, `text-[#1d1b18]`, `placeholder:text-[#57423b]/50`, `bg-[#9f3c16]`, `hover:bg-[#bf542c]`, `hover:bg-[#f3ede7]`.
8. `src/features/recipes/ui/recipe-workspace.tsx` (`L650-L762`): `text-[#9f3c16]`, `bg-[#dec0b7]`, `text-[#436558]`, `text-[#1d1b18]`, `text-[#57423b]`, `bg-[#f9f2ed]`, `border-[#dec0b7]/30`, `bg-[#f3ede7]`, `hover:bg-[#ede7e2]`.
9. `src/features/recipes/ui/ingredients-checklist.tsx` (`L84-L205`), `src/features/recipes/ui/recipe-stepper.tsx` (`L61-L143`), & `src/features/recipes/ui/reel-player-card.tsx` (`L64-L369`): 65+ occurrences of `#1d1b18`, `#57423b`, `#9f3c16`, `#cb4a1b`, `#ffdbd0`, `#436558`, `#c2e8d7`, `#476a5c`, `#f9f2ed`, `#f3ede7`, `#ede7e2`, `#dec0b7`, `#32302d`, `#ded9d5`.
10. `src/shared/ui/card.tsx` (`L13, L27, L80`): Hardcodes `rounded-none` instead of `rounded-xl` or `rounded-2xl`, forcing callers to pass class overrides.
11. `src/shared/ui/button.tsx` (`L14`): References `text-destructive-foreground`, which is **not defined** in `src/index.css` (`:root` or `@theme inline`).

---

## Part 3: Architecting a Single-Source Themeable Design System in Tailwind CSS v4

### 3.1 How `@theme` vs `@theme inline` Works in Tailwind CSS v4

In Tailwind CSS v4 (`node_modules/tailwindcss/theme.css`), design tokens are CSS custom properties declared inside `@theme`:

1. **`@theme { --color-primary: #a93201; }`** emits `--color-primary: #a93201` on `:root` and generates utilities like `.bg-primary { background-color: var(--color-primary); }`. However, if you want light/dark mode or multi-theme switching via `.dark` or `[data-theme="..."]`, overriding `--color-*` directly duplicates Tailwind's internal namespace.
2. **`@theme inline { --color-primary: var(--primary); }`** instructs the Tailwind v4 compiler to **inline the referenced variable expression** directly into generated utility classes:
   - `.bg-primary` compiles to `background-color: var(--primary);`
   - `.bg-primary\/10` compiles to `background-color: color-mix(in oklab, var(--primary) 10%, transparent);`
   - Because `color-mix(in oklab, var(--primary) ...)` evaluates at browser paint time against any valid CSS `<color>` (`#hex`, `oklch(...)`, `hsl(...)`), **`:root` and `.dark` can use either Hex or OKLCH interchangeably** and opacity modifiers (`border-outline-variant/40`, `bg-surface/90`, `ring-primary/30`) work automatically without RGB channel splitting!

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     src/styles/theme.css (SINGLE SOURCE)                │
│                                                                         │
│  LAYER 1: Theme Values (:root & .dark)                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ --primary, --secondary, --tertiary, --surface-container-*,        │  │
│  │ --success, --warning, --info, --destructive, --chart-1..5,        │  │
│  │ --font-sans, --font-display, --radius, --shadow-tactile-*         │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    ▼                                    │
│  LAYER 2: Tailwind v4 Compiler Contract (@theme inline & @utility)      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Maps --color-*, --font-*, --text-*, --radius-*, --shadow-*        │  │
│  │ + @utility shadow-tactile / interactive-tactile                   │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────────────┼────────────────────────────────────┘
                                     ▼
          Every shadcn/ui component & feature view uses ONLY
         semantic utilities (bg-surface-container-low, text-primary,
             border-outline-variant/40, interactive-tactile)
```

**Result:** To restyle the entire application—for example, switching from "Kitchen Playbook" (warm parchment `#fef8f4`, terracotta `#a93201`, `Quicksand`, chunky neo-brutalist offset shadows) to a cool minimalist SaaS theme (slate background, indigo primary, `Inter`, diffuse elevation shadows)—a developer edits **only Layer 1 (`:root` and `.dark`) in `src/styles/theme.css`**. Zero React component files change.

---

### 3.2 Complete Reference Implementation: `src/styles/theme.css`

Below is the complete, production-ready `src/styles/theme.css` reconciling `DESIGN.md` ("Kitchen Playbook") with `shadcn/ui`'s full token contract (`card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `sidebar`, `chart`), semantic status colors (`success`, `warning`, `info`), `DESIGN.md` typography scale, radius scale, and switchable tactile shadows:

```css
/* src/styles/theme.css */

/* ==========================================================================
   LAYER 1: SINGLE-SOURCE THEME PALETTE, TYPOGRAPHY, RADIUS & ELEVATION
   Edit this :root / .dark block (paired with DESIGN.md) to restyle the app.
   ========================================================================== */

:root {
  /* --- Font Families --- */
  --font-sans-family: "Quicksand", ui-sans-serif, system-ui, sans-serif;
  --font-display-family: "Quicksand", ui-sans-serif, system-ui, sans-serif;
  --font-mono-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  /* --- Base Radius Seed (drives rounded-xs through rounded-4xl) --- */
  --radius: 0.75rem; /* 12px base (rounded-lg = 12px, rounded-xl = 16px, rounded-2xl = 20px, rounded-3xl = 24px) */

  /* --- Surface & Canvas Hierarchy (DESIGN.md Kitchen Playbook) --- */
  --background: oklch(0.985 0.011 56.2); /* #fef8f4 Warm Off-White / Parchment */
  --foreground: oklch(0.222 0.006 56); /* #1d1b19 Charcoal */

  --surface: oklch(0.985 0.011 56.2); /* #fef8f4 */
  --surface-dim: oklch(0.892 0.009 56); /* #ded9d5 */
  --surface-bright: oklch(0.985 0.011 56.2); /* #fef8f4 */
  --surface-container-lowest: oklch(1 0 0); /* #ffffff Lifted Pure White */
  --surface-container-low: oklch(0.964 0.009 53.4); /* #f8f2ef Warm Low */
  --surface-container: oklch(0.947 0.011 56.3); /* #f3ede9 */
  --surface-container-high: oklch(0.929 0.011 56.3); /* #ede7e3 */
  --surface-container-highest: oklch(0.91 0.01 53.4); /* #e7e1de */
  --on-surface: oklch(0.222 0.006 56); /* #1d1b19 */
  --on-surface-variant: oklch(0.404 0.043 32.5); /* #59413a Muted Text */
  --inverse-surface: oklch(0.309 0.006 56); /* #32302e Media/Dark Surface */
  --inverse-on-surface: oklch(0.957 0.009 56.3); /* #f5f0ec */

  /* --- shadcn/ui Card & Popover Aliases --- */
  --card: var(--surface-container-lowest);
  --card-foreground: var(--on-surface);
  --popover: var(--surface-container-lowest);
  --popover-foreground: var(--on-surface);

  /* --- Primary (Terracotta) --- */
  --primary: oklch(0.491 0.17 34.3); /* #a93201 Terracotta */
  --primary-foreground: oklch(1 0 0); /* #ffffff */
  --primary-container: oklch(0.578 0.175 35.1); /* #cb4a1b */
  --on-primary-container: oklch(0.99 0.005 34.3); /* #fffbff */
  --primary-fixed: oklch(0.908 0.048 34.3); /* #ffdbd0 */
  --primary-fixed-dim: oklch(0.816 0.098 34.3); /* #ffb59e */

  /* --- Secondary (Sage Green) --- */
  --secondary: oklch(0.478 0.073 150.8); /* #3d6846 Sage Green */
  --secondary-foreground: oklch(1 0 0); /* #ffffff */
  --secondary-container: oklch(0.898 0.076 146.4); /* #bcebc0 */
  --on-secondary-container: oklch(0.493 0.075 150.4); /* #416c4a */

  /* --- Tertiary (Maize / Golden Yellow) --- */
  --tertiary: oklch(0.476 0.098 92.2); /* #715c00 */
  --tertiary-foreground: oklch(1 0 0); /* #ffffff */
  --tertiary-container: oklch(0.751 0.125 91.5); /* #c7a938 */
  --on-tertiary-container: oklch(0.362 0.075 92.2); /* #4d3e00 */
  --tertiary-fixed: oklch(0.912 0.138 94.5); /* #ffe17a */

  /* --- Muted & Accent (shadcn/ui primitives) --- */
  --muted: var(--surface-container); /* #f3ede9 */
  --muted-foreground: var(--on-surface-variant); /* #59413a */
  --accent: var(--secondary-container); /* #bcebc0 */
  --accent-foreground: var(--on-secondary-container); /* #416c4a */

  /* --- Semantic Status Tokens --- */
  --destructive: oklch(0.505 0.193 27.5); /* #ba1a1a Error */
  --destructive-foreground: oklch(1 0 0); /* #ffffff */
  --destructive-container: oklch(0.906 0.046 24.5); /* #ffdad6 */
  --on-destructive-container: oklch(0.418 0.169 27.2); /* #93000a */

  --success: var(--secondary); /* #3d6846 */
  --success-foreground: oklch(1 0 0);
  --success-container: var(--secondary-container);
  --on-success-container: var(--on-secondary-container);

  --warning: var(--tertiary); /* #715c00 */
  --warning-foreground: oklch(1 0 0);
  --warning-container: var(--tertiary-fixed); /* #ffe17a */
  --on-warning-container: var(--on-tertiary-container);

  --info: oklch(0.5 0.11 245);
  --info-foreground: oklch(1 0 0);
  --info-container: oklch(0.92 0.04 245);
  --on-info-container: oklch(0.32 0.09 245);

  /* --- Borders, Outlines, Inputs & Focus Ring --- */
  --outline: oklch(0.576 0.044 35.8); /* #8d7168 */
  --outline-variant: oklch(0.832 0.043 32.8); /* #e1bfb5 */
  --border: var(--outline-variant);
  --input: var(--outline-variant);
  --ring: var(--primary);

  /* --- Chart Palette (Culinary Warm-to-Fresh Scale) --- */
  --chart-1: var(--primary); /* Terracotta */
  --chart-2: var(--secondary); /* Sage Green */
  --chart-3: var(--tertiary-container); /* Maize Gold */
  --chart-4: var(--primary-container); /* Spiced Paprika */
  --chart-5: var(--outline); /* Warm Umber */

  /* --- Sidebar Tokens --- */
  --sidebar: var(--surface-container-low);
  --sidebar-foreground: var(--on-surface);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--surface-container);
  --sidebar-accent-foreground: var(--on-surface);
  --sidebar-border: var(--outline-variant);
  --sidebar-ring: var(--primary);

  /* --- Elevation & Tactile Shadows (Switchable in One Place) --- */
  /* Standard elevation scale */
  --shadow-color: 29 27 25;
  --shadow-2xs: 0 1px 0 0 rgb(var(--shadow-color) / 0.04);
  --shadow-xs: 0 1px 2px 0 rgb(var(--shadow-color) / 0.06);
  --shadow-sm: 0 2px 4px -1px rgb(var(--shadow-color) / 0.08);
  --shadow-md: 0 6px 12px -2px rgb(var(--shadow-color) / 0.1);
  --shadow-lg: 0 12px 24px -4px rgb(var(--shadow-color) / 0.12);
  --inset-shadow-input: inset 0 2px 4px 0 rgb(var(--shadow-color) / 0.05);

  /* Tactile / Chunky interaction tokens (set offsets to 0px and use diffuse shadow for flat SaaS themes) */
  --shadow-tactile: 4px 4px 0px 0px rgb(var(--shadow-color) / 0.1);
  --shadow-tactile-hover: 6px 6px 0px 0px rgb(var(--shadow-color) / 0.15);
  --shadow-tactile-active: 0px 0px 0px 0px rgb(var(--shadow-color) / 0.1);
  --tactile-hover-translate-x: 0px;
  --tactile-hover-translate-y: -2px;
  --tactile-active-translate-x: 2px;
  --tactile-active-translate-y: 2px;
}

.dark {
  --background: oklch(0.175 0.008 48);
  --foreground: oklch(0.957 0.009 56.3);

  --surface: oklch(0.175 0.008 48);
  --surface-dim: oklch(0.145 0.008 48);
  --surface-bright: oklch(0.265 0.012 48);
  --surface-container-lowest: oklch(0.135 0.006 48);
  --surface-container-low: oklch(0.205 0.01 48);
  --surface-container: oklch(0.23 0.012 48);
  --surface-container-high: oklch(0.265 0.014 48);
  --surface-container-highest: oklch(0.305 0.016 48);
  --on-surface: oklch(0.957 0.009 56.3);
  --on-surface-variant: oklch(0.795 0.032 38);
  --inverse-surface: oklch(0.929 0.011 56.3);
  --inverse-on-surface: oklch(0.222 0.006 56);

  --card: var(--surface-container-low);
  --card-foreground: var(--on-surface);
  --popover: var(--surface-container);
  --popover-foreground: var(--on-surface);

  --primary: oklch(0.72 0.155 36);
  --primary-foreground: oklch(0.21 0.05 34);
  --primary-container: oklch(0.491 0.17 34.3);
  --on-primary-container: oklch(0.95 0.03 34.3);

  --secondary: oklch(0.76 0.085 148);
  --secondary-foreground: oklch(0.2 0.04 150);
  --secondary-container: oklch(0.35 0.065 150);
  --on-secondary-container: oklch(0.898 0.076 146.4);

  --tertiary: oklch(0.83 0.13 92);
  --tertiary-foreground: oklch(0.24 0.05 92);
  --tertiary-container: oklch(0.42 0.085 92);
  --on-tertiary-container: oklch(0.912 0.138 94.5);

  --muted: var(--surface-container);
  --muted-foreground: var(--on-surface-variant);
  --accent: var(--surface-container-high);
  --accent-foreground: var(--on-surface);

  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.18 0.05 22);
  --destructive-container: oklch(0.36 0.13 25);
  --on-destructive-container: oklch(0.906 0.046 24.5);

  --outline: oklch(0.62 0.038 35.8);
  --outline-variant: oklch(0.345 0.025 35.8);
  --border: var(--outline-variant);
  --input: var(--outline-variant);
  --ring: var(--primary);

  --shadow-color: 0 0 0;
  --shadow-tactile: 4px 4px 0px 0px rgb(var(--shadow-color) / 0.35);
  --shadow-tactile-hover: 6px 6px 0px 0px rgb(var(--shadow-color) / 0.45);
  --shadow-tactile-active: 0px 0px 0px 0px rgb(var(--shadow-color) / 0.35);
}

/* ==========================================================================
   LAYER 2: TAILWIND V4 COMPILER CONTRACT (@theme inline & @utility)
   Do not hardcode colors here; reference Layer 1 CSS variables.
   ========================================================================== */

@theme inline {
  /* --- Font Families --- */
  --font-sans: var(--font-sans-family);
  --font-display: var(--font-display-family);
  --font-serif: var(--font-display-family);
  --font-mono: var(--font-mono-family);

  /* --- Semantic Typography Scale (DESIGN.md -> text-display-lg, text-headline-xl, etc.) --- */
  --text-display-lg: 3rem; /* 48px */
  --text-display-lg--line-height: 3.5rem; /* 56px */
  --text-display-lg--letter-spacing: -0.02em;
  --text-display-lg--font-weight: 700;

  --text-headline-xl: 2.5rem; /* 40px */
  --text-headline-xl--line-height: 3rem; /* 48px */
  --text-headline-xl--letter-spacing: -0.02em;
  --text-headline-xl--font-weight: 700;

  --text-headline-lg: 2rem; /* 32px */
  --text-headline-lg--line-height: 2.5rem; /* 40px */
  --text-headline-lg--font-weight: 700;

  --text-headline-md: 1.5rem; /* 24px */
  --text-headline-md--line-height: 2rem; /* 32px */
  --text-headline-md--font-weight: 600;

  --text-headline-sm: 1.25rem; /* 20px */
  --text-headline-sm--line-height: 1.75rem; /* 28px */
  --text-headline-sm--font-weight: 600;

  --text-title-md: 1.25rem; /* 20px */
  --text-title-md--line-height: 1.75rem; /* 28px */
  --text-title-md--font-weight: 600;

  --text-body-lg: 1.125rem; /* 18px */
  --text-body-lg--line-height: 1.75rem; /* 28px */
  --text-body-lg--font-weight: 500;

  --text-body-md: 1rem; /* 16px */
  --text-body-md--line-height: 1.5rem; /* 24px */
  --text-body-md--font-weight: 400;

  --text-body-sm: 0.875rem; /* 14px */
  --text-body-sm--line-height: 1.25rem; /* 20px */
  --text-body-sm--font-weight: 400;

  --text-label-lg: 0.875rem; /* 14px */
  --text-label-lg--line-height: 1rem; /* 16px */
  --text-label-lg--letter-spacing: 0.05em;
  --text-label-lg--font-weight: 700;

  --text-label-md: 0.75rem; /* 12px */
  --text-label-md--line-height: 1rem; /* 16px */
  --text-label-md--font-weight: 600;

  --text-label-sm: 0.75rem; /* 12px */
  --text-label-sm--line-height: 1rem; /* 16px */
  --text-label-sm--letter-spacing: 0.05em;
  --text-label-sm--font-weight: 700;

  /* --- Core shadcn/ui Color Utilities --- */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-container: var(--primary-container);
  --color-on-primary-container: var(--on-primary-container);
  --color-primary-fixed: var(--primary-fixed);
  --color-primary-fixed-dim: var(--primary-fixed-dim);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary-container: var(--secondary-container);
  --color-on-secondary-container: var(--on-secondary-container);
  --color-tertiary: var(--tertiary);
  --color-tertiary-foreground: var(--tertiary-foreground);
  --color-tertiary-container: var(--tertiary-container);
  --color-on-tertiary-container: var(--on-tertiary-container);
  --color-tertiary-fixed: var(--tertiary-fixed);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);

  /* --- Extended Surface & Outline Utilities --- */
  --color-surface: var(--surface);
  --color-surface-dim: var(--surface-dim);
  --color-surface-bright: var(--surface-bright);
  --color-surface-container-lowest: var(--surface-container-lowest);
  --color-surface-container-low: var(--surface-container-low);
  --color-surface-container: var(--surface-container);
  --color-surface-container-high: var(--surface-container-high);
  --color-surface-container-highest: var(--surface-container-highest);
  --color-on-surface: var(--on-surface);
  --color-on-surface-variant: var(--on-surface-variant);
  --color-inverse-surface: var(--inverse-surface);
  --color-inverse-on-surface: var(--inverse-on-surface);
  --color-outline: var(--outline);
  --color-outline-variant: var(--outline-variant);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* --- Status Color Utilities --- */
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-destructive-container: var(--destructive-container);
  --color-on-destructive-container: var(--on-destructive-container);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-container: var(--success-container);
  --color-on-success-container: var(--on-success-container);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-container: var(--warning-container);
  --color-on-warning-container: var(--on-warning-container);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-info-container: var(--info-container);
  --color-on-info-container: var(--on-info-container);

  /* --- Chart & Sidebar Utilities --- */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* --- Radius Scale (driven by --radius) --- */
  --radius-xs: calc(var(--radius) - 8px); /* 4px */
  --radius-sm: calc(var(--radius) - 6px); /* 6px */
  --radius-md: calc(var(--radius) - 4px); /* 8px */
  --radius-lg: var(--radius); /* 12px */
  --radius-xl: calc(var(--radius) + 4px); /* 16px */
  --radius-2xl: calc(var(--radius) + 8px); /* 20px */
  --radius-3xl: calc(var(--radius) + 12px); /* 24px */
  --radius-4xl: calc(var(--radius) + 20px); /* 32px */

  /* --- Shadow & Tactile Elevation Scale --- */
  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-tactile: var(--shadow-tactile);
  --shadow-tactile-hover: var(--shadow-tactile-hover);
  --shadow-tactile-active: var(--shadow-tactile-active);
  --inset-shadow-input: var(--inset-shadow-input);
}

/* --- Tactile Interaction Utilities (replaces legacy .chunky-shadow) --- */
@utility shadow-tactile {
  box-shadow: var(--shadow-tactile);
}

@utility interactive-tactile {
  box-shadow: var(--shadow-tactile);
  transition:
    transform 0.15s cubic-bezier(0.2, 0, 0, 1),
    box-shadow 0.15s cubic-bezier(0.2, 0, 0, 1);

  &:hover:not(:disabled) {
    transform: translate(var(--tactile-hover-translate-x), var(--tactile-hover-translate-y));
    box-shadow: var(--shadow-tactile-hover);
  }

  &:active:not(:disabled) {
    transform: translate(var(--tactile-active-translate-x), var(--tactile-active-translate-y));
    box-shadow: var(--shadow-tactile-active);
  }
}
```

And `src/index.css` becomes a clean, minimal entry point:

```css
/* src/index.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "./styles/theme.css";

@custom-variant dark (&:is(.dark *));

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    @apply font-sans antialiased;
  }
  body {
    @apply bg-background text-foreground font-sans min-h-screen;
  }
}
```

---

### 3.3 Wiring `shadcn/ui` Primitives to the Theme Tokens

Once `src/styles/theme.css` is in place, `src/shared/ui/button.tsx` and `src/shared/ui/card.tsx` inherit the tactile design system automatically without caller overrides:

1. **`Button` (`src/shared/ui/button.tsx`):**
   - `default` variant: `"bg-primary text-primary-foreground rounded-xl font-bold interactive-tactile hover:bg-primary-container"`
   - `secondary` variant: `"bg-secondary-container text-on-secondary-container rounded-xl font-semibold hover:bg-secondary-container/80"`
   - `outline` variant: `"border border-outline-variant/60 bg-surface-container-lowest text-foreground rounded-xl interactive-tactile hover:bg-surface-container"`
2. **`Card` (`src/shared/ui/card.tsx`):**
   - Replace hardcoded `rounded-none` (`src/shared/ui/card.tsx#L13`) with `rounded-2xl border border-outline-variant/40 bg-card text-card-foreground shadow-tactile`.
3. **Eliminating All Hardcoded Hex Leaks Across `forklore-fe`:**

| Hardcoded Class Found in `forklore-fe`                       | Semantic Tailwind v4 Replacement                                                 |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------- |
| `bg-[#fff8f3]`, `bg-[#fef8f4]`                               | `bg-background` or `bg-surface`                                                  |
| `bg-white` (on cards/inputs)                                 | `bg-card` or `bg-surface-container-lowest`                                       |
| `bg-[#f9f2ed]`, `bg-[#f8f2ef]`                               | `bg-surface-container-low`                                                       |
| `bg-[#f3ede7]`, `bg-[#f3ede9]`                               | `bg-surface-container` or `bg-muted`                                             |
| `hover:bg-[#ede7e2]`, `bg-[#ede7e3]`                         | `hover:bg-surface-container-high`, `bg-surface-container-high`                   |
| `bg-[#32302d]` (reel player dark frame)                      | `bg-inverse-surface`                                                             |
| `text-[#1d1b18]`, `text-[#1d1b19]`                           | `text-foreground` or `text-on-surface`                                           |
| `text-[#57423b]`, `text-[#59413a]`                           | `text-muted-foreground` or `text-on-surface-variant`                             |
| `bg-[#9f3c16]`, `text-[#9f3c16]`                             | `bg-primary`, `text-primary`                                                     |
| `hover:bg-[#bf542c]`, `bg-[#cb4a1b]`                         | `hover:bg-primary-container`, `bg-primary-container`                             |
| `bg-[#436558]`, `text-[#436558]`                             | `bg-secondary`, `text-secondary`                                                 |
| `bg-[#c2e8d7] text-[#476a5c]`                                | `bg-secondary-container text-on-secondary-container`                             |
| `border-[#dec0b7]/40`, `border-[#dec0b7]/60`                 | `border-outline-variant/40`, `border-outline-variant/60` (or `border-border/40`) |
| `chunky-shadow chunky-shadow-hover active:translate-y-[2px]` | `interactive-tactile` (or `shadow-tactile` for non-interactive surfaces)         |
| `text-xs font-bold uppercase tracking-wider text-[#57423b]`  | `text-label-sm uppercase text-on-surface-variant`                                |

### 3.4 Automated Guardrail Against Future Theme Leaks

To guarantee that single-file theming never regresses, add a fast CI/lint check (or Vitest unit test) that fails if any `.tsx` file under `src/` contains arbitrary hex color utilities (`/(?:bg|text|border|ring|fill|stroke|from|via|to)-\[#[0-9a-fA-F]{3,8}\]/`):

```ts
// src/test/theme-hygiene.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HEX_UTILITY_RE =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to)-\[#[0-9a-fA-F]{3,8}\]/g;

function getTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory()
      ? getTsxFiles(fullPath)
      : fullPath.endsWith(".tsx")
        ? [fullPath]
        : [];
  });
}

describe("Single-Source Theme Hygiene", () => {
  it("forbids hardcoded arbitrary hex color utilities in TSX components", () => {
    const violations = getTsxFiles(join(process.cwd(), "src")).flatMap((file) => {
      const matches = readFileSync(file, "utf8").match(HEX_UTILITY_RE);
      return matches ? [`${file}: ${matches.join(", ")}`] : [];
    });
    expect(violations).toEqual([]);
  });
});
```
