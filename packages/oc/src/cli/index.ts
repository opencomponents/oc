import semver from 'semver';
import strings from '../resources';
import commands from './commands';
import Local from './domain/local';
import Registry from './domain/registry';
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
import registryMigrateMetadata from './facade/registry-migrate-metadata';
import registryRemove from './facade/registry-remove';
import validate from './facade/validate';
import logger from './logger';
import createProgram from './program';
import validateCommand from './validate-command';

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
  'registry-migrate-metadata': registryMigrateMetadata,
  'registry-remove': registryRemove,
  validate
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

const program = createProgram({
  usage: commands.usage,
  commands: commands.commands,
  epilogue: strings.messages.cli.HELP_HINT,
  version: require('../../package.json').version,
  validate: validateCommand
});

program(process.argv.slice(2), (commandPath, options) => {
  const facade =
    cliFunctions[commandPath.join('-') as keyof typeof cliFunctions](
      dependencies
    );

  // @ts-expect-error not callable
  facade(options).catch(() => {
    process.exit(1);
  });
});
