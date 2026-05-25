import fs from 'node:fs';
import indexView from '../src/registry/views';
import infoView from '../src/registry/views/info';
import { mockComponentHistory, mockIndexVM, mockInfoVM } from './fakeVM';

const clientJS = fs.readFileSync(
  './src/components/oc-client/_package/src/oc-client.js',
  'utf8'
);

const serve = (content: any) => ({
  GET: () => {
    const isHTML = typeof content === 'string' && content.includes('</body>');

    return typeof content !== 'string'
      ? Response.json(content)
      : new Response(isHTML ? addReloadScript(content) : content, {
          headers: {
            'Content-Type': isHTML ? 'text/html' : 'application/javascript'
          }
        });
  }
});
const id = crypto.randomUUID();

const addReloadScript = (content: string) => {
  return content.replace(
    '</body>',
    `<script>${`(function() {
      window.id = '${id}';
      setInterval(async () => {
        await fetch('/id').then(res => res.json())
          .then(data => {
            if (data.id !== id) {
              window.location.reload();
            }
          })
          .catch(() => {
            console.error('Failed to fetch id');
          });
      }, 500);
    })();`}</script></body>`
  );
};

Bun.serve({
  port: 4444,
  routes: {
    '/id': serve({ id }),
    '/oc-client/client.js': serve(clientJS),
    '/~registry/history': serve({ componentsHistory: mockComponentHistory }),
    '/:name/:version/~info': serve(infoView(mockInfoVM)),
    '/': serve(indexView(mockIndexVM))
  }
});

console.log('Server is running on http://localhost:4444');
