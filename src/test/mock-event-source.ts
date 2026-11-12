type EventSourceListener = (event: MessageEvent) => void;

export class MockEventSource {
  static instances = new Map<string, MockEventSource>();

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = 1; // OPEN
  onerror: ((err: Event) => void) | null = null;
  private listeners = new Map<string, Set<EventSourceListener>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = Boolean(init?.withCredentials);
    MockEventSource.instances.set(url, this);
  }

  addEventListener(type: string, listener: EventSourceListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: EventSourceListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, data: unknown) {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    const event = new MessageEvent(type, { data: payload });
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  close() {
    this.readyState = 2; // CLOSED
    MockEventSource.instances.delete(this.url);
  }

  static reset() {
    for (const instance of MockEventSource.instances.values()) {
      instance.close();
    }
    MockEventSource.instances.clear();
  }
}
