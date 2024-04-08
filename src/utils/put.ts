import path from 'node:path';
import FormData from 'form-data';
import fs from 'fs-extra';
import got from 'got';

async function put(
  urlPath: string,
  files: string | string[],
  headers: Record<string, string | string[] | undefined>
): Promise<string> {
  const form = new FormData();

  if (!Array.isArray(files)) {
    files = [files];
  }

  files.forEach((file) => {
    const fileName = path.basename(file);
    form.append(fileName, fs.createReadStream(file));
  });

  const res = await got(urlPath, {
    headers: { ...headers, ...form.getHeaders() },
    method: 'PUT',
    body: form
  });

  if (res.statusCode !== 200) {
    throw res.body;
  }

  return res.body;
}

export default put;
