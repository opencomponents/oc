import path from 'node:path';
import { settings } from '@oc-framework/core';
import chokidar from 'chokidar';

export default function watch(
  dirs: string[],
  baseDir: string,
  changed: (err: Error | null, fileName: string, componentDir?: string) => void
): void {
  const watcher = chokidar.watch(path.resolve(baseDir), {
    ignored: settings.filesToIgnoreOnDevWatch,
    persistent: true,
    ignoreInitial: true,
    usePolling: true
  });
  const onChange = (fileName: string) => {
    const componentDir = dirs.find((dir) =>
      Boolean(fileName.match(escapeRegularExpression(dir + path.sep)))
    );
    changed(null, fileName, componentDir);
  };

  watcher
    .on('add', onChange)
    .on('change', onChange)
    .on('unlink', onChange)
    .on('error', (err: unknown) => {
      changed(
        err instanceof Error ? err : new Error(String(err)),
        '',
        undefined
      );
    });
}

function escapeRegularExpression(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
