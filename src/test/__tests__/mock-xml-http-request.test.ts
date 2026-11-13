import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockXMLHttpRequest } from "../mock-xml-http-request";

describe("MockXMLHttpRequest Test Harness", () => {
  beforeEach(() => {
    MockXMLHttpRequest.install();
  });

  afterEach(() => {
    MockXMLHttpRequest.restore();
    MockXMLHttpRequest.reset();
  });

  it("captures open, headers, and send parameters", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/files");
    xhr.setRequestHeader("X-Custom-Header", "test-val");
    xhr.setRequestHeader("traceparent", "00-123-456-01");

    const formData = new FormData();
    formData.append("key", "value");
    xhr.send(formData);

    const mockXhr = MockXMLHttpRequest.lastInstance;
    expect(mockXhr).toBeDefined();
    expect(mockXhr?.method).toBe("POST");
    expect(mockXhr?.url).toBe("/api/v1/files");
    expect(mockXhr?.requestHeaders["x-custom-header"]).toBe("test-val");
    expect(mockXhr?.requestHeaders.traceparent).toBe("00-123-456-01");
    expect(mockXhr?.requestBody).toBe(formData);
  });

  it("simulates determinate upload progress events deterministically", () => {
    const xhr = new XMLHttpRequest();
    const progressSpy = vi.fn();
    xhr.upload.onprogress = progressSpy;

    xhr.open("PUT", "https://s3.example.com/upload");
    xhr.send(new Blob(["hello"]));

    const mockXhr = MockXMLHttpRequest.lastInstance;
    expect(mockXhr).toBeDefined();

    mockXhr?.simulateProgress(50, 100);
    expect(progressSpy).toHaveBeenCalledTimes(1);
    expect(progressSpy.mock.calls[0][0].loaded).toBe(50);
    expect(progressSpy.mock.calls[0][0].total).toBe(100);
    expect(progressSpy.mock.calls[0][0].lengthComputable).toBe(true);

    mockXhr?.simulateProgress(100, 100);
    expect(progressSpy).toHaveBeenCalledTimes(2);
    expect(progressSpy.mock.calls[1][0].loaded).toBe(100);
  });

  it("simulates successful response and triggers onload", () => {
    const xhr = new XMLHttpRequest();
    const loadSpy = vi.fn();
    const readyStateSpy = vi.fn();
    xhr.onload = loadSpy;
    xhr.onreadystatechange = readyStateSpy;

    xhr.open("GET", "/api/v1/files");
    xhr.send();

    const mockXhr = MockXMLHttpRequest.lastInstance;
    mockXhr?.simulateResponse(200, JSON.stringify({ id: "file-1" }), {
      "Content-Type": "application/json",
    });

    expect(xhr.status).toBe(200);
    expect(xhr.readyState).toBe(4);
    expect(xhr.responseText).toBe(JSON.stringify({ id: "file-1" }));
    expect(xhr.getResponseHeader("content-type")).toBe("application/json");
    expect(loadSpy).toHaveBeenCalled();
  });

  it("simulates abort behavior deterministically", () => {
    const xhr = new XMLHttpRequest();
    const abortSpy = vi.fn();
    const uploadAbortSpy = vi.fn();

    xhr.onabort = abortSpy;
    xhr.upload.onabort = uploadAbortSpy;

    xhr.open("POST", "/api/v1/files");
    xhr.send(new Blob(["data"]));

    xhr.abort();

    expect(abortSpy).toHaveBeenCalled();
    expect(uploadAbortSpy).toHaveBeenCalled();
    expect(xhr.status).toBe(0);
    expect(xhr.readyState).toBe(0);
  });
});
