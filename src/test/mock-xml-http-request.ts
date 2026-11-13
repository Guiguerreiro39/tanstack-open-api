type ProgressCallback = (event: ProgressEvent) => void;
type EventCallback = (event: Event) => void;

export class MockXMLHttpRequestUpload implements EventTarget {
  onprogress: ProgressCallback | null = null;
  onload: ProgressCallback | null = null;
  onerror: ProgressCallback | null = null;
  onabort: ProgressCallback | null = null;
  onloadstart: ProgressCallback | null = null;
  onloadend: ProgressCallback | null = null;

  private listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (!callback) return;
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(callback);
  }

  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (!callback) return;
    this.listeners.get(type)?.delete(callback);
  }

  dispatchEvent(event: Event): boolean {
    const directHandler = (this as unknown as Record<string, ((ev: Event) => void) | null>)[
      `on${event.type}`
    ];
    if (typeof directHandler === "function") {
      directHandler(event);
    }
    const set = this.listeners.get(event.type);
    if (set) {
      for (const listener of set) {
        if (typeof listener === "function") {
          listener(event);
        } else if (listener && typeof listener.handleEvent === "function") {
          listener.handleEvent(event);
        }
      }
    }
    return true;
  }
}

export class MockXMLHttpRequest implements EventTarget {
  static instances: MockXMLHttpRequest[] = [];
  static originalXHR: typeof XMLHttpRequest | null = null;
  static onSendHandler: ((xhr: MockXMLHttpRequest) => void) | null = null;

  static get lastInstance(): MockXMLHttpRequest | null {
    return MockXMLHttpRequest.instances[MockXMLHttpRequest.instances.length - 1] ?? null;
  }

  static install(): void {
    if (typeof window !== "undefined" && !MockXMLHttpRequest.originalXHR) {
      MockXMLHttpRequest.originalXHR = window.XMLHttpRequest;
      try {
        Object.defineProperty(window, "XMLHttpRequest", {
          value: MockXMLHttpRequest,
          writable: true,
          configurable: true,
        });
      } catch {
        // biome-ignore lint/suspicious/noExplicitAny: Fallback
        (window as any).XMLHttpRequest = MockXMLHttpRequest;
      }
      try {
        Object.defineProperty(globalThis, "XMLHttpRequest", {
          value: MockXMLHttpRequest,
          writable: true,
          configurable: true,
        });
      } catch {
        // biome-ignore lint/suspicious/noExplicitAny: Fallback
        (globalThis as any).XMLHttpRequest = MockXMLHttpRequest;
      }
    }
  }

  static restore(): void {
    if (typeof window !== "undefined" && MockXMLHttpRequest.originalXHR) {
      try {
        Object.defineProperty(window, "XMLHttpRequest", {
          value: MockXMLHttpRequest.originalXHR,
          writable: true,
          configurable: true,
        });
      } catch {
        // biome-ignore lint/suspicious/noExplicitAny: Fallback
        (window as any).XMLHttpRequest = MockXMLHttpRequest.originalXHR;
      }
      try {
        Object.defineProperty(globalThis, "XMLHttpRequest", {
          value: MockXMLHttpRequest.originalXHR,
          writable: true,
          configurable: true,
        });
      } catch {
        // biome-ignore lint/suspicious/noExplicitAny: Fallback
        (globalThis as any).XMLHttpRequest = MockXMLHttpRequest.originalXHR;
      }
      MockXMLHttpRequest.originalXHR = null;
    }
  }

  static reset(): void {
    MockXMLHttpRequest.instances = [];
    MockXMLHttpRequest.onSendHandler = null;
  }

  readonly upload = new MockXMLHttpRequestUpload();

  method = "GET";
  url = "";
  async = true;
  requestHeaders: Record<string, string> = {};
  requestBody: Document | XMLHttpRequestBodyInit | null = null;

  status = 0;
  statusText = "";
  readyState = 0; // UNSENT
  responseText = "";
  response: unknown = null;
  responseType: XMLHttpRequestResponseType = "";
  responseURL = "";
  withCredentials = false;
  timeout = 0;
  responseHeaders: Record<string, string> = {};

  onload: EventCallback | null = null;
  onerror: EventCallback | null = null;
  onabort: EventCallback | null = null;
  ontimeout: EventCallback | null = null;
  onreadystatechange: EventCallback | null = null;
  onloadstart: EventCallback | null = null;
  onloadend: EventCallback | null = null;

  private listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  open(method: string, url: string | URL, async = true): void {
    this.method = method.toUpperCase();
    this.url = url.toString();
    this.async = async;
    this.readyState = 1; // OPENED
    this.dispatchReadyStateChange();
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name.toLowerCase()] = value;
  }

  send(body?: Document | XMLHttpRequestBodyInit | null): void {
    this.requestBody = body ?? null;
    if (MockXMLHttpRequest.onSendHandler) {
      MockXMLHttpRequest.onSendHandler(this);
    }
  }

  abort(): void {
    this.status = 0;
    this.statusText = "abort";
    this.readyState = 0; // UNSENT

    const abortProgressEvent = new ProgressEvent("abort", {
      lengthComputable: false,
      loaded: 0,
      total: 0,
    });
    this.upload.dispatchEvent(abortProgressEvent);

    const abortEvent = new Event("abort");
    this.dispatchEvent(abortEvent);
    this.dispatchReadyStateChange();
  }

  simulateProgress(loaded: number, total: number): void {
    const event = new ProgressEvent("progress", {
      lengthComputable: total > 0,
      loaded,
      total,
    });
    this.upload.dispatchEvent(event);
  }

  simulateResponse(
    status: number,
    responseBody: unknown = "",
    headers: Record<string, string> = {},
  ): void {
    this.status = status;
    this.statusText = status >= 200 && status < 300 ? "OK" : "Error";
    this.responseHeaders = headers;

    if (typeof responseBody === "string") {
      this.responseText = responseBody;
      this.response = responseBody;
    } else {
      this.responseText = JSON.stringify(responseBody);
      this.response = responseBody;
    }

    // Finish upload
    const uploadLoad = new ProgressEvent("load", {
      lengthComputable: true,
      loaded: 100,
      total: 100,
    });
    this.upload.dispatchEvent(uploadLoad);

    // XHR state transitions
    this.readyState = 4; // DONE
    this.dispatchReadyStateChange();

    const loadEvent = new Event("load");
    this.dispatchEvent(loadEvent);
  }

  simulateError(status = 500, responseBody: unknown = "Internal Server Error"): void {
    this.status = status;
    this.statusText = "Error";
    this.responseText =
      typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
    this.response = this.responseText;

    const errorProgressEvent = new ProgressEvent("error");
    this.upload.dispatchEvent(errorProgressEvent);

    this.readyState = 4;
    this.dispatchReadyStateChange();

    const errorEvent = new Event("error");
    this.dispatchEvent(errorEvent);
  }

  getResponseHeader(name: string): string | null {
    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(this.responseHeaders)) {
      if (key.toLowerCase() === lower) {
        return value;
      }
    }
    return null;
  }

  getAllResponseHeaders(): string {
    return Object.entries(this.responseHeaders)
      .map(([k, v]) => `${k}: ${v}\r\n`)
      .join("");
  }

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (!callback) return;
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(callback);
  }

  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null): void {
    if (!callback) return;
    this.listeners.get(type)?.delete(callback);
  }

  dispatchEvent(event: Event): boolean {
    const directHandler = (this as unknown as Record<string, ((ev: Event) => void) | null>)[
      `on${event.type}`
    ];
    if (typeof directHandler === "function") {
      directHandler(event);
    }
    const set = this.listeners.get(event.type);
    if (set) {
      for (const listener of set) {
        if (typeof listener === "function") {
          listener(event);
        } else if (listener && typeof listener.handleEvent === "function") {
          listener.handleEvent(event);
        }
      }
    }
    return true;
  }

  private dispatchReadyStateChange(): void {
    if (this.onreadystatechange) {
      this.onreadystatechange(new Event("readystatechange"));
    }
    const set = this.listeners.get("readystatechange");
    if (set) {
      for (const listener of set) {
        if (typeof listener === "function") {
          listener(new Event("readystatechange"));
        } else if (listener && typeof listener.handleEvent === "function") {
          listener.handleEvent(new Event("readystatechange"));
        }
      }
    }
  }
}
