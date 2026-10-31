import type { ServerResponse } from 'node:http';

export default function onHeaders(
  res: ServerResponse,
  listener: () => void
): void {
  const writeHead = res.writeHead;
  let fired = false;

  res.writeHead = function (this: ServerResponse, ...args: any[]) {
    if (!fired) {
      fired = true;
      if (typeof args[0] === 'number') this.statusCode = args[0];
      listener.call(this);
    }
    return writeHead.apply(this, args as any);
  } as ServerResponse['writeHead'];
}
