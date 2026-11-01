import fs from 'node:fs/promises';
import path from 'node:path';

export async function listFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    const stat = entry.isSymbolicLink() ? await fs.stat(file) : entry;
    if (stat.isDirectory()) {
      files.push(...(await listFiles(file)));
    } else {
      files.push(file);
    }
  }

  return files;
}
