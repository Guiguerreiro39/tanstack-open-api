# Changelog

## [0.1.1](https://github.com/Guiguerreiro39/tanstack-open-api/compare/v0.1.0...v0.1.1) (2026-11-16)


### Features

* **auth:** implement Better Auth session, SSR header forwarding, and RBAC guards (closes [#23](https://github.com/Guiguerreiro39/tanstack-open-api/issues/23)) ([6283d08](https://github.com/Guiguerreiro39/tanstack-open-api/commit/6283d087d423c43205342ba323381bb7a27bf890))
* **ci:** release-please pipeline, conventional commits governance, and ruleset protection ([e92e760](https://github.com/Guiguerreiro39/tanstack-open-api/commit/e92e760f2cab49cd372dff7d63fb6747c33f010b))
* **core:** initialize foundation, theme tokens, and app runtime (closes [#20](https://github.com/Guiguerreiro39/tanstack-open-api/issues/20)) ([b97048c](https://github.com/Guiguerreiro39/tanstack-open-api/commit/b97048c9f1d78ee60a8235da277f5ebb6d740045))
* **files:** implement multi-strategy file uploads, progress tracking, downloads, and files slice (closes [#25](https://github.com/Guiguerreiro39/tanstack-open-api/issues/25)) ([e7d06ca](https://github.com/Guiguerreiro39/tanstack-open-api/commit/e7d06ca0e7175074965d107d9ab03607739c0e91))
* **infra:** implement production server, Dockerfile, docker-compose, and CI workflow (closes [#26](https://github.com/Guiguerreiro39/tanstack-open-api/issues/26)) ([45ad744](https://github.com/Guiguerreiro39/tanstack-open-api/commit/45ad7440a71e90203c1927a638cfa1d89d4aa588))
* **observability:** implement ObservabilityPort, telemetry adapters, and W3C tracing (closes [#21](https://github.com/Guiguerreiro39/tanstack-open-api/issues/21)) ([845852e](https://github.com/Guiguerreiro39/tanstack-open-api/commit/845852ef8c4927e7051d80eba20e8bae4fc37183))
* TanStack Start + Effect + OpenAPI Frontend Starter Kit ([0d1f348](https://github.com/Guiguerreiro39/tanstack-open-api/commit/0d1f3488934d27609804c9e360003154a97f0568))
* **tasks:** implement Orval codegen, Effect contracts, live SSE query, and tasks slice (closes [#24](https://github.com/Guiguerreiro39/tanstack-open-api/issues/24)) ([379ac99](https://github.com/Guiguerreiro39/tanstack-open-api/commit/379ac99ed0176d0907f63f8eaca79f0c7cb7fa88))
* **ui:** implement shadcn registry primitives, form fields, and showcase route (closes [#22](https://github.com/Guiguerreiro39/tanstack-open-api/issues/22)) ([6c0521b](https://github.com/Guiguerreiro39/tanstack-open-api/commit/6c0521b62ed7fdbb7f7d7e46740976d093ab3da3))


### Bug Fixes

* **auth:** remove any assertion on typed navigate to home ([3f21bfc](https://github.com/Guiguerreiro39/tanstack-open-api/commit/3f21bfcb8c86c0b600b520184496bf40bebe8f80))
* **ci:** format GEMINI.md and skip dev prepare script in prod-deps Docker stage ([82f9fdd](https://github.com/Guiguerreiro39/tanstack-open-api/commit/82f9fdd11d290f6cdc614dc76927ba60eeeda4a0))
* **ci:** guard lefthook install in prepare script for docker builds ([dc48624](https://github.com/Guiguerreiro39/tanstack-open-api/commit/dc4862413456c6076c7575b783281c9cb8eb9d9d))
* **hardening:** resolve adversarial audit findings across contracts, rbac, and server ([d2bc321](https://github.com/Guiguerreiro39/tanstack-open-api/commit/d2bc3211dc9dd861148899858f97e5bd6254baad))
* **test:** wire in-memory TanStack SSR handler in server.test.ts when dist is not built ([92eb7c5](https://github.com/Guiguerreiro39/tanstack-open-api/commit/92eb7c5470e9fc7d3a3acb090476f91f8de94dc2))
* **ui,auth:** redirect to home upon login, format task items full-width, reorder appearance button ([e1faccb](https://github.com/Guiguerreiro39/tanstack-open-api/commit/e1faccb17bf8b1762db129df8f581acffd5010a9))
* **ui,auth:** redirect to home upon login, format task items full-width, reorder appearance button ([ca22c4a](https://github.com/Guiguerreiro39/tanstack-open-api/commit/ca22c4a67dea295ac7bb3db267d6121b8177d4a1))


### Documentation

* add design system, glossary, ADRs, and research notes ([a21f2b3](https://github.com/Guiguerreiro39/tanstack-open-api/commit/a21f2b367a08066a1ca7a07043651ca161b5dfc9))
* add GEMINI.md capturing agent environment friction and solutions ([04ebc6a](https://github.com/Guiguerreiro39/tanstack-open-api/commit/04ebc6a649658b16d059079dea64f86f91ba8af3))
* **adr:** add ADR-0010 and release pipeline research notes ([a1f08c9](https://github.com/Guiguerreiro39/tanstack-open-api/commit/a1f08c99e5ffcee87a28d2ab37349572d0058cd3))
* complete starter kit documentation suite, onboarding playbooks, and runtime verification skill (closes [#27](https://github.com/Guiguerreiro39/tanstack-open-api/issues/27)) ([85ca01a](https://github.com/Guiguerreiro39/tanstack-open-api/commit/85ca01ae7749be9db08ad847856d4dd2616c369a))


### CI/CD & Governance

* **governance:** add github ruleset, provisioning script, renovate, and docs ([#39](https://github.com/Guiguerreiro39/tanstack-open-api/issues/39)) ([1dc4732](https://github.com/Guiguerreiro39/tanstack-open-api/commit/1dc47323d700fc35548e038a39395937579aa909))
* **governance:** add two-tier commitlint, lefthook git hooks, and pr title workflow ([#37](https://github.com/Guiguerreiro39/tanstack-open-api/issues/37)) ([87552c6](https://github.com/Guiguerreiro39/tanstack-open-api/commit/87552c68cad322984bbfcf9365ef10dd0ff62cb7))
* **release:** add release-please pipeline, ghcr publishing, and slsa provenance ([#38](https://github.com/Guiguerreiro39/tanstack-open-api/issues/38)) ([6778b9a](https://github.com/Guiguerreiro39/tanstack-open-api/commit/6778b9ac6483804335fbd7738aa07a377156ea0c))
* **workflows:** remove invalid disallowScopes sequence from pr-title workflow ([24a3a46](https://github.com/Guiguerreiro39/tanstack-open-api/commit/24a3a467f0a6c58f83122afdaec7e6fd990e340a))
