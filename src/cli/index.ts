import _ from 'lodash';
import semver from 'semver';
import cli from 'yargs';
import commands from './commands';

import strings from '../resources';
import Local from './domain/local';
import Registry from './domain/registry';
import logger from './logger';
import validateCommand from './validate-command';

import clean from './facade/clean';
import dev from './facade/dev';
import init from './facade/init';
import mock from './facade/mock';
import packageScript from './facade/package';
import preview from './facade/preview';
import publish from './facade/publish';
import registry from './facade/registry';
import registryAdd from './facade/registry-add';
import registryLs from './facade/registry-ls';
import registryRemove from './facade/registry-remove';

const cliFunctions = {
  clean,
  dev,
  init,
  mock,
  package: packageScript,
  preview,
  publish,
  registry,
  'registry-add': registryAdd,
  'registry-ls': registryLs,
  'registry-remove': registryRemove
};

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
  commands?: Record<string, Command>;
};

function processCommand(
  command: Command,
  commandName: string,
  cli: cli.Argv,
  lvl?: number,
  prefix = ''
) {
  const level = (lvl || 0) + 1;
  const facade =
    cliFunctions[`${prefix}${commandName}` as keyof typeof cliFunctions](
      dependencies
    );

  cli.command(
    command.cmd || commandName,
    command.description,
    (yargs) => {
      yargs.usage(command.usage);

      if (command.options) {
        yargs.options(command.options);
      }

      if (command.commands) {
        yargs
          .check((argv) => validateCommand(argv, level))
          .epilogue(strings.messages.cli.HELP_HINT);

        const newPrefix = (prefix ? prefix + '-' : '') + commandName + '-';

        for (const [commandName, commandConfiguration] of Object.entries(
          command.commands
        )) {
          processCommand(
            commandConfiguration,
            commandName,
            yargs,
            level,
            newPrefix
          );
        }
      }

      if (command.example) {
        yargs.example(
          command.example.cmd,
          command.example.description || command.description
        );
      }

      return yargs;
    },
    (options) => {
      // @ts-ignore not callable
      facade(options).catch(() => {
        process.exit(1);
      });
    }
  );
}

for (const [commandName, command] of Object.entries(commands.commands)) {
  processCommand(command, commandName, cli);
}

const argv = cli
  .completion()
  .check((argv) => validateCommand(argv, 0))
  .usage(commands.usage)
  .epilogue(strings.messages.cli.HELP_HINT)
  .help('h')
  .alias('h', 'help')
  .version()
  .wrap(cli.terminalWidth()).argv;

if ((argv as Awaited<typeof argv>)._.length === 0) {
  cli.showHelp();
}
