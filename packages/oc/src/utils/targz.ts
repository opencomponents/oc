import fs from 'node:fs/promises';
import * as tar from 'tar';

export async function compress(
  src: string,
  dest: string,
  prefix: string
): Promise<void> {
  await tar.create(
    { gzip: true, file: dest, cwd: src, prefix },
    await fs.readdir(src)
  );
}

export async function decompress(
  src: string,
  dest: string,
  mode = 0
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  await tar.extract({
    file: src,
    cwd: dest,
    onReadEntry: (entry) => {
      if (entry.mode !== undefined) entry.mode |= mode;
    }
  });
}
