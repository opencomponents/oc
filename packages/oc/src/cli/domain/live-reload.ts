import http from 'node:http';

const clientScript = (port: number) => `(function () {
  var source = new EventSource('http://localhost:${port}/events');
  source.onmessage = function () { window.location.reload(); };
})();`;

export default function createLiveReloadServer(port: number): {
  refresh: () => void;
} {
  const clients = new Set<http.ServerResponse>();

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if (pathname === '/livereload.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(clientScript(port));
    } else if (pathname === '/events') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive'
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(port);

  return {
    refresh() {
      for (const client of clients) client.write('data: reload\n\n');
    }
  };
}
