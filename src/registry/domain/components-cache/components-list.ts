import * as fastq from 'fastq';
import type { queueAsPromised } from 'fastq';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import semver from 'semver';
import type { ComponentsList, Config } from '../../../types';
import pLimit from '../../../utils/pLimit';
import eventsHandler from '../events-handler';

const delay = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const validateComponentVersion =
  (conf: Config, cdn: StorageAdapter) =>
  (componentName: string, componentVersion: string) => {
    return cdn
      .getJson(
        // Check integrity of the package by checking existence of package.json
        // OC will upload always the package.json last when publishing
        `${conf.storage.options.componentsDir}/${componentName}/${componentVersion}/package.json`
      )
      .then(() => true)
      .catch(() => false);
  };

interface QueueTask {
  conf: Config;
  cdn: StorageAdapter;
  name: string;
  version: string;
}
const cleanupQueue: queueAsPromised<QueueTask> = fastq.promise(
  cleanupWorker,
  1
);

async function cleanupWorker(arg: QueueTask): Promise<void> {
  const validator = validateComponentVersion(arg.conf, arg.cdn);
  const isValid = await validator(arg.name, arg.version);
  if (!isValid) {
    await arg.cdn.removeDir(
      `${arg.conf.storage.options.componentsDir}/${arg.name}/${arg.version}`
    );
  }
}

export default function componentsList(conf: Config, cdn: StorageAdapter) {
  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components.json`;
  const validator = validateComponentVersion(conf, cdn);

  const componentsList = {
    getFromJson: (): Promise<ComponentsList> => cdn.getJson(filePath(), true),

    getFromDirectories: async (
      jsonList: ComponentsList | null
    ): Promise<ComponentsList> => {
      const componentsInfo: Record<string, string[]> = {};

      const getVersionsForComponent = async (
        componentName: string
      ): Promise<string[]> => {
        const allVersions = await cdn.listSubDirectories(
          `${conf.storage.options.componentsDir}/${componentName}`
        );
        const unCheckedVersions = allVersions.filter(
          (version) => !jsonList?.components[componentName]?.includes(version)
        );
        const limit = pLimit(cdn.maxConcurrentRequests);
        const invalidVersions = (
          await Promise.all(
            unCheckedVersions.map((unCheckedVersion) =>
              limit(async () => {
                const isValid = await validator(
                  componentName,
                  unCheckedVersion
                );

                return isValid ? null : unCheckedVersion;
              })
            )
          )
        ).filter((x): x is string => typeof x === 'string');

        if (invalidVersions.length > 0) {
          eventsHandler.fire('error', {
            code: 'corrupted_version',
            message: `Couldn't validate the integrity of the component ${componentName} on the following versions: ${invalidVersions.join(
              ', '
            )}.`
          });
          delay(60_000).then(() => {
            for (const invalidVersion of invalidVersions) {
              cleanupQueue
                .push({
                  conf,
                  cdn,
                  name: componentName,
                  version: invalidVersion
                })
                .catch(() => {});
            }
          });
        }

        const validVersions = allVersions.filter(
          (version) => !invalidVersions.includes(version)
        );

        return validVersions.sort(semver.compare);
      };

      try {
        const components = await cdn.listSubDirectories(
          conf.storage.options.componentsDir
        );
        const limit = pLimit(cdn.maxConcurrentRequests);

        const versions = await Promise.all(
          components.map((component) =>
            limit(() => getVersionsForComponent(component))
          )
        );

        components.forEach((component, i) => {
          componentsInfo[component] = versions[i];
        });

        return {
          lastEdit: getUnixUTCTimestamp(),
          components: componentsInfo
        };
      } catch (err: any) {
        if (err.code === 'dir_not_found') {
          return {
            lastEdit: getUnixUTCTimestamp(),
            components: {}
          };
        }
        throw err;
      }
    },

    async refresh(cachedList: ComponentsList): Promise<ComponentsList> {
      const components = await componentsList.getFromDirectories(cachedList);
      await componentsList.save(components);

      return components;
    },

    save: (data: ComponentsList): Promise<unknown> =>
      cdn.putFileContent(JSON.stringify(data), filePath(), true)
  };

  return componentsList;
}
