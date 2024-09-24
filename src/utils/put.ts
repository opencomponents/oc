import path from 'node:path';
import FormData from 'form-data';
import fs from 'fs-extra';
import { request } from 'undici';

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
    body: form
  });

  const response = await res.body.text();
  if (res.statusCode !== 200) {
    throw response;
  }

  return response;
}

export default put;
