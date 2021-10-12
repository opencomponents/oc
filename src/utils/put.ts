import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';
import url from 'url';

export default function put(
  urlPath: string,
  files: string | string[],
  headers: Record<string, string> | Callback<any, Error | string>,
  callback: Callback<any, Error | string>
): void {
  if (typeof headers === 'function') {
    callback = headers;
    headers = {};
  }

  const form = new FormData();
  const options = { ...url.parse(urlPath), method: 'PUT', headers: {} };
  let body = '';
  let callbackDone = false;

  if (!Array.isArray(files)) {
    files = [files];
  }

  files.forEach(file => {
    const fileName = path.basename(file);
    form.append(fileName, fs.createReadStream(file));
  });

  options.headers = { ...headers, ...form.getHeaders() };

  form.submit(options as any, (err, res) => {
    if (err) {
      callbackDone = true;
      return callback(err, undefined as any);
    }

    res.on('data', chunk => {
      body += chunk;
    });

    res.on('end', () => {
      if (!callbackDone) {
        callbackDone = true;

        if (res.statusCode !== 200) {
          callback(body, undefined as any);
        } else {
          callback(null, body);
        }
      }
    });
  });
}
