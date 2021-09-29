import { Arguments } from 'yargs';
import commands from './commands';
import strings from '../resources';

export default function validateCommand(argv: Arguments, level: number): true {
  let keys = Object.keys(commands.commands);
  if (level === 1) {
    keys = Object.keys(commands.commands[argv._[0]].commands || {});
  }

  if (argv._.length > level && !keys.includes(argv._[String(level)])) {
    throw new Error(strings.messages.cli.NO_SUCH_COMMAND(argv._[level]));
  }

  return true;
}
