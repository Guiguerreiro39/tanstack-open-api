import type { IncomingMessage, Server, ServerResponse } from "node:http";

export interface CreateAppHandlerOptions {
  clientDir?: string;
  serverEntryPath?: string;
  apiInternalUrl?: string;
  serverHandler?: (req: Request) => Promise<Response>;
}

export interface CreateAppServerOptions extends CreateAppHandlerOptions {
  port?: number;
  host?: string;
}

export interface AppServerInstance {
  httpServer: Server;
  port: number;
  host: string;
  start(): Promise<Server>;
  stop(gracePeriodMs?: number): Promise<void>;
}

export function createAppHandler(
  options?: CreateAppHandlerOptions,
): Promise<(req: IncomingMessage, res: ServerResponse) => Promise<void>>;

export function createAppServer(options?: CreateAppServerOptions): AppServerInstance;
