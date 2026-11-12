# TanStack OpenAPI Starter

A reusable full-stack React frontend starter built on Feature-Sliced Design, TanStack Start/Router/Query/Form, Effect, Orval OpenAPI contracts, and Tailwind v4 + shadcn/ui, paired with `hono-open-api`.

## Language

**Layer**:
One of the four top-level horizontal tiers in the Feature-Sliced Design hierarchy (`app`, `routes`, `features`, `shared`), ordered strictly by responsibility and unidirectional import rules.
_Avoid_: Tier, bucket, package

**Feature Slice**:
A self-contained vertical capability (`auth`, `tasks`, `files`, `showcase`) inside the `features` layer that owns the user-facing workflows, API bindings, and state for one domain area.
_Avoid_: Feature module, domain module, plugin, service

**Segment**:
A technical grouping inside a `Feature Slice` (`api`, `model`, `ui`) or inside the `shared` layer (`ui`, `api`, `config`, `observability`, `lib`) that organizes code by its purpose rather than domain concept.
_Avoid_: Subfolder, category, layer

**Composition Root**:
The single side-effect-free assembly boundary (`getRouter` and `createAppRuntime`) where the router, query client, and Effect runtime adapters are wired into `RouterAppContext` per request or test.
_Avoid_: Bootstrap, global singleton, container

**Port**:
A driver-agnostic Effect service interface in `shared` (such as `ObservabilityPort`) that defines a seam without coupling callers to a third-party SDK.
_Avoid_: Client, gateway, provider

**Adapter**:
A concrete implementation of a `Port` (such as Sentry, Datadog, Console, Noop, or Composite) wired into the Effect runtime at the `Composition Root`.
_Avoid_: Driver, plugin, mock (reserve mock for test-framework spies)

**Contract**:
A declarative binding (`FunctionDescriptor` created via `defineContract`) that pairs an OpenAPI operation, its generated Effect `Schema`, and its error decoder to bridge Orval's transport hooks with Effect's typed error channel.
_Avoid_: DTO, endpoint wrapper, service method

**Resource Scope**:
The visibility and action boundary (`own` vs `all`, governed by owner matching versus `:any` role permissions) applied to user-owned domain entities (`tasks` and `files`).
_Avoid_: Filter mode, tenant, view mode

**Live Query**:
A TanStack Query cache entry synchronized with a server-sent event (`SSE`) stream that hydrates and updates via Effect-validated `init` and `update` snapshots rather than polling.
_Avoid_: Subscription, polling query, websocket channel

**Defect**:
An unexpected runtime or contract failure (`5xx` server responses, `UnknownError` transport failures, `SchemaDecodeError` contract drift, or uncaught React render/hydration errors) reported to `ObservabilityPort` as an actionable alert, distinct from expected `4xx` domain errors handled in UI flows.
_Avoid_: Exception, bug, domain error

**Design Token**:
A semantic CSS custom property defined in `src/styles/theme.css` and bound to Tailwind v4 via `@theme inline` so components express visual role (surface level, emphasis, status, typography scale, radius, or tactile elevation) rather than literal style values.
_Avoid_: Hardcoded hex, magic value, arbitrary color utility

**Theme Preset**:
A self-contained Layer 1 custom-property bundle (`:root`, `.dark`, or `[data-theme="<preset>"]`) that restyles palette, typography, border radius, and tactile-vs-diffuse elevation across the entire application without modifying component markup.
_Avoid_: Skin, component theme prop, stylesheet fork

**Field Primitive**:
A context-bound form control in `src/shared/ui/form.tsx` (registered via `createFormHook` over `shadcn/ui`'s `Field` slots) that pairs Effect `StandardSchemaV1` validation issues with post-interaction `aria-invalid` and conditional `aria-describedby` error links without per-field boilerplate.
_Avoid_: RHF controller, raw input wrapper, form field hook

**Presigned Upload**:
A three-step file transfer workflow (`POST /api/v1/files/presign` creating a `"pending"` record, direct `PUT` of bytes to the signed storage URL `/_storage/object` or S3, and `POST /api/v1/files/{id}/complete` verifying magic bytes and promoting the record to `"ready"`).
_Avoid_: Two-step upload, chunked upload, direct S3 upload

**Test Harness**:
The boundary-interception test assembly in `src/test/` (`renderAppRoutes`, `renderWithProviders`, MSW `msw-server`, `MockEventSource`, `MockXMLHttpRequest`, and `SpyObservabilityAdapter`) that mounts the real `Composition Root` and replaces external I/O without internal `vi.mock()` calls.
_Avoid_: Mock wrapper, shallow renderer, module mock suite




