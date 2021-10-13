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
    { logger, ...options }: Options<typeof dev> & { logger: Logger },
    cb: Cb<typeof dev>
  ): void => {
    const deps = getDeps({ logger });

    dev(deps)(options, cb);
  },
  init: (
    { logger, ...options }: Options<typeof init> & { logger: Logger },
    cb: Cb<typeof init>
  ): void => {
    const deps = getDeps({ logger });

    init(deps)(options, cb);
  },
  mock: (
    { logger, ...options }: Options<typeof mock> & { logger: Logger },
    cb: Cb<typeof mock>
  ): void => {
    const deps = getDeps({ logger });

    mock(deps)(options, cb);
  },
  package: (
    { logger, ...options }: Options<typeof packageScript> & { logger: Logger },
    cb: Cb<typeof packageScript>
  ): void => {
    const deps = getDeps({ logger });

    packageScript(deps)(options, cb);
  },
  publish: (
    {
      logger,
      ...options
    }: Options<typeof publish> & { logger: Logger; registry?: string },
    cb: Cb<typeof publish>
  ): void => {
    const deps = getDeps({ logger, withRegistry: true });

    publish(deps)(options, cb);
  },
  preview: (
    {
      logger,
      ...options
    }: Options<typeof preview> & { logger: Logger; registry?: string },
    cb: Cb<typeof preview>
  ): void => {
    const deps = getDeps({ logger, withRegistry: true });

    preview(deps)(options, cb);
  },
  registry: {
    add: (
      {
        logger,
        ...options
      }: Options<typeof registryAdd> & {
        logger: Logger;
        registry?: string;
      },
      cb: Cb<typeof registryAdd>
    ): void => {
      const deps = getDeps({ logger, withRegistry: true });

      registryAdd(deps)(options, cb);
    },
    ls: (
      {
        logger,
        ...options
      }: Options<typeof registryLs> & {
        logger: Logger;
        registry?: string;
      },
      cb: Cb<typeof registryLs>
    ): void => {
      const deps = getDeps({ logger, withRegistry: true });

      registryLs(deps)(options, cb);
    },
    remove: (
      {
        logger,
        ...options
      }: Options<typeof registryRemove> & {
        logger: Logger;
        registry?: string;
      },
      cb: Cb<typeof registryRemove>
    ): void => {
      const deps = getDeps({ logger, withRegistry: true });

      registryRemove(deps)(options, cb);
    }
  }
};
