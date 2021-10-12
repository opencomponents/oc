import cli from 'yargs';
import commands from './commands';
import semver from 'semver';
import _ from 'lodash';

import Local from './domain/local';
import logger from './logger';
import Registry from './domain/registry';
import strings from '../resources';
import validateCommand from './validate-command';

const currentNodeVersion = process.version;
const minSupportedVersion = '6.0.0';
if (semver.lt(currentNodeVersion, minSupportedVersion)) {
  logger.err(
    strings.errors.cli.NODE_CLI_VERSION_UNSUPPORTED(
      currentNodeVersion,
      minSupportedVersion
    )
  );
}

const dependencies = {
  local: Local(),
  logger,
  registry: Registry()
};

type Command = {
  cmd?: string;
  description: string;
  usage: string;
  example?: {
    description?: string;
    cmd: string;
  };
  options?: any;
  commands?: Dictionary<Command>;
};

function processCommand(
  command: Command,
  commandName: string,
  cli: cli.Argv,
  lvl?: number,
  prefix = ''
) {
  const level = (lvl || 0) + 1;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const facade = require(`./facade/${prefix}${commandName}`).default(
    dependencies
  );

  cli.command(
    command.cmd || commandName,
    command.description,
    yargs => {
      yargs.usage(command.usage);

      if (command.options) {
        yargs.options(command.options);
      }

      if (command.commands) {
        yargs
          .check(argv => validateCommand(argv, level))
          .epilogue(strings.messages.cli.HELP_HINT);

        const newPrefix = (prefix ? prefix + '-' : '') + commandName + '-';

        _.mapValues(command.commands, (commandConfiguration, commandName) => {
          processCommand(
            commandConfiguration,
            commandName,
            yargs,
            level,
            newPrefix
          );
        });
      }

      if (command.example) {
        yargs.example(command.example.cmd, command.example.description!);
      }

      return yargs;
    },
    options => {
      facade(options, (error: unknown) => {
        if (error) {
          return process.exit(1);
        }
      });
    }
  );
}

_.forEach(commands.commands, (command, commandName) => {
  processCommand(command, commandName, cli);
});

const argv = cli
  .completion()
  .check(argv => validateCommand(argv, 0))
  .usage(commands.usage)
  .epilogue(strings.messages.cli.HELP_HINT)
  .help('h')
  .alias('h', 'help')
  .version()
  .wrap(cli.terminalWidth()).argv;

if ((argv as any)._.length === 0) {
  cli.showHelp();
}
