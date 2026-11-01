import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  backfillMetadataFromStorageDetails,
  fromPromise,
  getMetadataAdapterOptions,
  getPromiseBasedAdapter
} from '@oc-framework/core';

// TODO: share the registry input-options type from @oc-framework/core once
// options-sanitiser is decomposed. Kept structural here so the CLI does not
// depend on the registry runtime for types.
type RegistryInputOptions = {
  [key: string]: any;
};

type SanitisedRegistryOptions = {
  storage: any;
  metadata?: any;
  [key: string]: any;
};

const loadRegistryRuntime = async (): Promise<{
  sanitiseOptions: (input: RegistryInputOptions) => SanitisedRegistryOptions;
  validateRegistryConfiguration: (input: unknown) => {
    isValid: boolean;
    message?: string;
  };
}> => {
  try {
    return await dynamicImport('@oc-framework/registry');
  } catch (err: any) {
    if (
      err?.code === 'MODULE_NOT_FOUND' &&
      String(err?.message ?? '').includes('@oc-framework/registry')
    ) {
      throw new Error(
        'The registry migrate-metadata command requires the registry runtime. Install the "oc" package for the full experience.'
      );
    }
    throw err;
  }
};

import type { Logger } from '../logger';

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<any>;

const loadConfigModule = async (resolvedConfigPath: string): Promise<any> => {
  try {
    const resolvedRequirePath = require.resolve(resolvedConfigPath);
    delete require.cache[resolvedRequirePath];
    return require(resolvedRequirePath);
  } catch (err: any) {
    if (err?.code !== 'ERR_REQUIRE_ESM') {
      throw err;
    }

    return dynamicImport(
      `${pathToFileURL(resolvedConfigPath).href}?t=${Date.now()}`
    );
  }
};

const loadRegistryOptions = async (
  configPath: string
): Promise<RegistryInputOptions> => {
  const resolvedConfigPath = path.resolve(configPath);
  const configModule = await loadConfigModule(resolvedConfigPath);
  const candidate = configModule?.default ?? configModule;
  const options =
    typeof candidate === 'function' ? await candidate() : candidate;

  if (!options || typeof options !== 'object') {
    throw new Error('Registry config must export an options object');
  }

  return options as RegistryInputOptions;
};

const registryMigrateMetadata = ({ logger }: { logger: Logger }) =>
  fromPromise(
    async (opts: {
      configPath: string;
    }): Promise<{
      scanned: number;
      inserted: number;
      skipped: number;
    }> => {
      try {
        const inputOptions = await loadRegistryOptions(opts.configPath);
        const { validateRegistryConfiguration } = await loadRegistryRuntime();
        const validationResult = validateRegistryConfiguration(inputOptions);

        if (!validationResult.isValid) {
          throw new Error(validationResult.message);
        }

        const { sanitiseOptions } = await loadRegistryRuntime();
        const conf = sanitiseOptions(inputOptions);
        if (!conf.metadata) {
          throw new Error('Registry config must include metadata options');
        }

        const metadataStore = conf.metadata.adapter(
          getMetadataAdapterOptions(conf)
        );
        const cdn = getPromiseBasedAdapter(
          conf.storage.adapter(conf.storage.options)
        );

        try {
          await metadataStore.initialise();
          const result = await backfillMetadataFromStorageDetails({
            metadataStore,
            cdn,
            componentsDir: conf.storage.options.componentsDir
          });

          logger.ok(
            `Metadata migration completed: ${result.scanned} scanned, ${result.inserted} inserted, ${result.skipped} skipped`
          );

          return result;
        } finally {
          if (metadataStore.close) {
            await metadataStore.close();
          }
        }
      } catch (err) {
        logger.err(String((err as Error)?.message || err));
        throw err;
      }
    }
  );

export default registryMigrateMetadata;
