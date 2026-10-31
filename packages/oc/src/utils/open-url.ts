import { spawn } from 'node:child_process';

export default function openUrl(url: string): Promise<void> {
  const { command, args } =
    process.platform === 'darwin'
      ? { command: 'open', args: [url] }
      : process.platform === 'win32'
        ? {
            command: 'cmd',
            args: ['/s', '/c', 'start', '""', '/b', url.replace(/&/g, '^&')]
          }
        : { command: 'xdg-open', args: [url] };

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: true
    });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
