import path from 'node:path';
import { fromPromise } from 'universalify';
import { backfillMetadataFromStorageDetails } from '../../registry/domain/metadata-migration';
import sanitiseOptions, {
  type RegistryOptions
} from '../../registry/domain/options-sanitiser';
import getPromiseBasedAdapter from '../../registry/domain/storage-adapter';
import * as validator from '../../registry/domain/validators';
import type { Logger } from '../logger';

const loadRegistryOptions = async (
  configPath: string
): Promise<RegistryOptions> => {
  const resolvedConfigPath = path.resolve(configPath);
  delete require.cache[require.resolve(resolvedConfigPath)];
  const configModule = require(resolvedConfigPath) as any;
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

        const metadataStore = conf.metadata.adapter(conf.metadata.options);
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
