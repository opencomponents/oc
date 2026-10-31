import readline from 'node:readline';
import { Writable } from 'node:stream';

export default function prompt({
  prompt = '',
  default: def = '',
  silent = false
}: {
  prompt?: string;
  default?: string;
  silent?: boolean;
} = {}): Promise<string> {
  const stdout = process.stdout;
  const terminal = !!stdout.isTTY;
  let text = `${prompt.trim()} `;
  if (def) text += silent ? '(<default hidden>) ' : `(${def}) `;

  let muted = false;
  const output = new Writable({
    write(chunk, encoding, cb) {
      if (!muted) stdout.write(chunk, encoding);
      cb();
    }
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal
  });

  return new Promise((resolve, reject) => {
    rl.on('SIGINT', () => {
      rl.close();
      reject(new Error('canceled'));
    });
    rl.question(text, (line) => {
      if (silent && terminal) stdout.write('\r\n');
      rl.close();
      resolve(line.replace(/\r?\n$/, '') || def);
    });
    muted = silent;
  });
}
