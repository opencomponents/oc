import colors from 'colors/safe';

type Color =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'grey';

const logger = {
  // eslint-disable-next-line no-console
  writeLn: console.log,
  write: (msg: string) => process.stdout.write(msg.toString())
};

const log = (msg: string, color: Color | null, newLine: boolean) =>
  logger[newLine ? 'writeLn' : 'write'](color ? colors[color](msg) : msg);

export default {
  err: (msg: string, noNewLine?: boolean) => log(msg, 'red', !noNewLine),
  log: (msg: string, noNewLine?: boolean) => log(msg, null, !noNewLine),
  ok: (msg: string, noNewLine?: boolean) => log(msg, 'green', !noNewLine),
  warn: (msg: string, noNewLine?: boolean) => log(msg, 'yellow', !noNewLine)
};
