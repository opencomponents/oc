import _ from 'lodash';
import local from './domain/local';
import { Logger } from './logger';
import Registry from './domain/registry';

import dev from './facade/dev';
import init from './facade/init';
import mock from './facade/mock';
import packageScript from './facade/package';
import publish from './facade/publish';
import preview from './facade/preview';
import registryAdd from './facade/registry-add';
import registryLs from './facade/registry-ls';
import registryRemove from './facade/registry-remove';
import { Local, RegistryCli } from '../types';

type Options<T extends (...args: any) => any> = Parameters<ReturnType<T>>[0];
type Cb<T extends (...args: any) => any> = Parameters<ReturnType<T>>[1];

function getDeps(options: { logger?: Logger }): {
  local: Local;
  logger: Logger;
};
function getDeps(options: {
  logger?: Logger;
  withRegistry: true;
  registry?: string;
}): { local: Local; logger: Logger; registry: RegistryCli };
function getDeps(options: {
  logger?: Logger;
  withRegistry?: boolean;
  registry?: string;
}) {
  const deps = {
    local: local(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logger: options.logger || { log() {}, err() {}, ok() {}, warn() {} }
  };

  return options.withRegistry
    ? { ...deps, registry: Registry({ registry: options.registry }) }
    : deps;
}

export default {
  dev: (
    options: Options<typeof dev> & { logger: Logger },
    cb: Cb<typeof dev>
  ): void => {
    const deps = getDeps({ logger: options.logger });
    const opts = _.omit(options, 'logger');

    dev(deps)(opts, cb);
  },
  init: (
    options: Options<typeof init> & { logger: Logger },
    cb: Cb<typeof init>
  ): void => {
    const deps = getDeps({ logger: options.logger });
    const opts = _.omit(options, 'logger');

    init(deps)(opts, cb);
  },
  mock: (
    options: Options<typeof mock> & { logger: Logger },
    cb: Cb<typeof mock>
  ): void => {
    const deps = getDeps({ logger: options.logger });
    const opts = _.omit(options, 'logger');

    mock(deps)(opts, cb);
  },
  package: (
    options: Options<typeof packageScript> & { logger: Logger },
    cb: Cb<typeof packageScript>
  ): void => {
    const deps = getDeps({ logger: options.logger });
    const opts = _.omit(options, 'logger');

    packageScript(deps)(opts, cb);
  },
  publish: (
    options: Options<typeof publish> & { logger: Logger; registry?: string },
    cb: Cb<typeof publish>
  ): void => {
    const deps = getDeps({ logger: options.logger, withRegistry: true });
    const opts = _.omit(options, 'logger');

    publish(deps)(opts, cb);
  },
  preview: (
    options: Options<typeof preview> & { logger: Logger; registry?: string },
    cb: Cb<typeof preview>
  ): void => {
    const deps = getDeps({ logger: options.logger, withRegistry: true });
    const opts = _.omit(options, 'logger');

    preview(deps)(opts, cb);
  },
  registry: {
    add: (
      options: Options<typeof registryAdd> & {
        logger: Logger;
        registry?: string;
      },
      cb: Cb<typeof registryAdd>
    ): void => {
      const deps = getDeps({ logger: options.logger, withRegistry: true });
      const opts = _.omit(options, 'logger');

      registryAdd(deps)(opts, cb);
    },
    ls: (
      options: Options<typeof registryLs> & {
        logger: Logger;
        registry?: string;
      },
      cb: Cb<typeof registryLs>
    ): void => {
      const deps = getDeps({ logger: options.logger, withRegistry: true });
      const opts = _.omit(options, 'logger');

      registryLs(deps)(opts, cb);
    },
    remove: (
      options: Options<typeof registryRemove> & {
        logger: Logger;
        registry?: string;
      },
      cb: Cb<typeof registryRemove>
    ): void => {
      const deps = getDeps({ logger: options.logger, withRegistry: true });
      const opts = _.omit(options, 'logger');

      registryRemove(deps)(opts, cb);
    }
  }
};
