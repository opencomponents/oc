declare module 'oc-client';
declare module 'basic-auth-connect' {
  import type { IncomingMessage, ServerResponse } from 'node:http';

  // Middleware function type
  type Middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: any) => void
  ) => void;

  // Sync callback function type
  type SyncCallback = (user: string, pass: string) => boolean;

  // Async callback function type
  type AsyncCallback = (
    user: string,
    pass: string,
    fn: (err: any, user?: any) => void
  ) => void;

  // Main function overloads
  function basicAuth(username: string, password: string): Middleware;
  function basicAuth(callback: SyncCallback): Middleware;
  function basicAuth(callback: AsyncCallback): Middleware;

  export = basicAuth;
}
