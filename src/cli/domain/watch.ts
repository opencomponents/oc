import path from 'node:path';
import chokidar from 'chokidar';

import settings from '../../resources/settings';

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
    .on('error', changed);
}

function escapeRegularExpression(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
