import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fromPromise } from 'universalify';
import getMetadataAdapterOptions from '../../registry/domain/metadata-adapter-options';
import { backfillMetadataFromStorageDetails } from '../../registry/domain/metadata-migration';
import sanitiseOptions, {
  type RegistryOptions
} from '../../registry/domain/options-sanitiser';
import getPromiseBasedAdapter from '../../registry/domain/storage-adapter';
import * as validator from '../../registry/domain/validators';
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
): Promise<RegistryOptions> => {
  const resolvedConfigPath = path.resolve(configPath);
  const configModule = await loadConfigModule(resolvedConfigPath);
  const candidate = configModule?.default ?? configModule;
  const options =
    typeof candidate === 'function' ? await candidate() : candidate;

  if (!options || typeof options !== 'object') {
    throw new Error('Registry config must export an options object');
  }

  return options as RegistryOptions;
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
        const validationResult =
          validator.validateRegistryConfiguration(inputOptions);

        if (!validationResult.isValid) {
          throw new Error(validationResult.message);
        }

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
