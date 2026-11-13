# Runtime Verification Feature Flows

This directory contains the detailed step-by-step verification procedures for each of the 5 core capability areas of `tanstack-open-api`.

## Feature Flow Directory

| Feature Flow                    | Target Route      | Core Capabilities Verified                                                                                                      | Guide                                                            |
| :------------------------------ | :---------------- | :------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------- |
| **`showcase-and-theming`**      | `/showcase`       | OKLCH color tokens, `ThemeSwitcher`, tactile elevation physics (`shadow-tactile`, `interactive-tactile`), shadcn/ui components. | [`showcase-and-theming.md`](./showcase-and-theming.md)           |
| **`auth-and-rbac`**             | `/login`, `/_app` | Better Auth credentials, SSR header forwarding, session caching, pathless route guards, `<Can />` authorization.                | [`auth-and-rbac.md`](./auth-and-rbac.md)                         |
| **`live-tasks`**                | `/_app/tasks`     | Realtime SSE `/api/v1/tasks/live`, optimistic mutations, mutation buffering under `["tasks", "mutation"]`, task CRUD.           | [`live-tasks.md`](./live-tasks.md)                               |
| **`files-upload-and-download`** | `/_app/files`     | Direct multipart uploads, 3-step presigned uploads with determinate progress, authenticated binary downloads.                   | [`files-upload-and-download.md`](./files-upload-and-download.md) |
| **`observability-and-headers`** | All routes        | W3C `traceparent` and `X-Request-Id` headers in `customFetch`, defect capture vs breadcrumb filtering.                          | [`observability-and-headers.md`](./observability-and-headers.md) |
