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
  err: (msg: string, newLine?: boolean) => void;
  log: (msg: string, newLine?: boolean) => void;
  ok: (msg: string, newLine?: boolean) => void;
  warn: (msg: string, newLine?: boolean) => void;
}

const logger: Logger = {
  err: (msg: string, newLine = true) => log(msg, 'red', newLine),
  log: (msg: string, newLine = true) => log(msg, null, newLine),
  ok: (msg: string, newLine = true) => log(msg, 'green', newLine),
  warn: (msg: string, newLine = true) => log(msg, 'yellow', newLine)
};

export default logger;
