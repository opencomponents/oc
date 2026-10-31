import strings from '../resources';
import commands from './commands';
import type { Argv } from './program';

export default function validateCommand(argv: Argv, level: number): true {
  let keys = Object.keys(commands.commands);
  if (level === 1) {
    keys = Object.keys((commands as any).commands[argv._[0]].commands || {});
  }

  if (argv._.length > level && !keys.includes((argv as any)._[String(level)])) {
    throw new Error(
      strings.messages.cli.NO_SUCH_COMMAND(String(argv._[level]))
    );
  }

  return true;
}
