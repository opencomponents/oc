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

const logFns = {
  // eslint-disable-next-line no-console
  writeLn: console.log,
  write: (msg: string) => process.stdout.write(msg.toString())
};

const log = (msg: string, color: Color | null, newLine: boolean) =>
  logFns[newLine ? 'writeLn' : 'write'](color ? colors[color](msg) : msg);

export interface Logger {
  err: (msg: string, noNewLine?: boolean) => void;
  log: (msg: string, noNewLine?: boolean) => void;
  ok: (msg: string, noNewLine?: boolean) => void;
  warn: (msg: string, noNewLine?: boolean) => void;
}

const logger: Logger = {
  err: (msg: string, noNewLine?: boolean) => log(msg, 'red', !noNewLine),
  log: (msg: string, noNewLine?: boolean) => log(msg, null, !noNewLine),
  ok: (msg: string, noNewLine?: boolean) => log(msg, 'green', !noNewLine),
  warn: (msg: string, noNewLine?: boolean) => log(msg, 'yellow', !noNewLine)
};

export default logger;
