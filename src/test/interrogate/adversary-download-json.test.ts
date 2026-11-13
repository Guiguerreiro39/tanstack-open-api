import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { downloadFileDirect } from "@/features/files/api/download";
import { server } from "@/test/msw-server";

describe("Adversary 1: downloadFileDirect fails on JSON files", () => {
  it("fails to return a Blob when downloading a JSON file", async () => {
    const jsonContent = JSON.stringify({ key: "value", numbers: [1, 2, 3] });

    server.use(
      http.get("/api/v1/files/f-json-1/download", () => {
        return new HttpResponse(jsonContent, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="data.json"',
          },
        });
      }),
    );

    const blob = await downloadFileDirect("f-json-1", { fileName: "data.json" });

    // Intent: downloadFileDirect returns a Blob so that the browser can save it as a file.
    // Reality: customFetch inspects Content-Type, sees application/json, and returns a parsed Object!
    expect(blob).toBeInstanceOf(Blob);
  });
});
