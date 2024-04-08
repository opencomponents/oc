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
  writeLn: console.log,
  write: (msg: string) => process.stdout.write(msg.toString())
};

const log = (msg: string, color: Color | null, keepLine: boolean) =>
  logFns[keepLine ? 'write' : 'writeLn'](color ? colors[color](msg) : msg);

export interface Logger {
  err: (msg: string, keepLine?: boolean) => void;
  log: (msg: string, keepLine?: boolean) => void;
  ok: (msg: string, keepLine?: boolean) => void;
  warn: (msg: string, keepLine?: boolean) => void;
}

const logger: Logger = {
  err: (msg: string, keepLine?: boolean) => log(msg, 'red', !!keepLine),
  log: (msg: string, keepLine?: boolean) => log(msg, null, !!keepLine),
  ok: (msg: string, keepLine?: boolean) => log(msg, 'green', !!keepLine),
  warn: (msg: string, keepLine?: boolean) => log(msg, 'yellow', !!keepLine)
};

export default logger;
