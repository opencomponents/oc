import path from 'node:path';

import { getMimeType } from './get-mime-type';

export function getFileInfo(filePath: string) {
  let ext = path.extname(filePath).toLowerCase();
  let isGzipped = false;

  if (ext === '.gz') {
    isGzipped = true;
    ext = path.extname(filePath.slice(0, -3)).toLowerCase();
  }

  return {
    gzip: isGzipped,
    extname: ext,
    mimeType: getMimeType(ext)
  };
}
