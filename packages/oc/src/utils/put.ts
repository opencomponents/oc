import path from 'node:path';
import FormData from 'form-data';
import fs from 'fs-extra';
import { Agent, request } from 'undici';

// undici v8 enables HTTP/2 by default when the TLS server negotiates it via
// ALPN. Some gateways/proxies reset large multipart uploads over h2, surfacing
// as "Premature close". Force HTTP/1.1 for the publish upload to avoid this.
const dispatcher = new Agent({ allowH2: false });

async function put(
  urlPath: string,
  files: string | string[],
  headers: Record<string, string | string[] | undefined>
): Promise<string> {
  const form = new FormData();

  if (!Array.isArray(files)) {
    files = [files];
  }

  for (const file of files) {
    const fileName = path.basename(file);
    form.append(fileName, fs.createReadStream(file));
  }

  const res = await request(urlPath, {
    headers: { ...headers, ...form.getHeaders() },
    method: 'PUT',
    body: form,
    dispatcher
  });

  const response = await res.body.text();
  if (res.statusCode !== 200) {
    throw response;
  }

  return response;
}

export default put;
