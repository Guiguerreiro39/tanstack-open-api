import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "./openapi.json",
    output: {
      mode: "split",
      target: "src/shared/api/generated/endpoints.ts",
      schemas: "src/shared/api/generated/models",
      client: "react-query",
      httpClient: "fetch",
      override: {
        mutator: {
          path: "./src/shared/api/client.ts",
          name: "customFetch",
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
        query: {
          useQuery: true,
          useInfinite: true,
          useInfiniteQueryParam: "cursor",
        },
      },
    },
  },
  apiEffectSchemas: {
    input: "./openapi.json",
    output: {
      mode: "single",
      target: "src/shared/api/generated/schemas.ts",
      client: "effect",
      override: {
        useDates: false,
        effect: {
          generateEachHttpStatus: true,
        },
      },
    },
  },
});
