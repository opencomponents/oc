import semver from 'semver';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import eventsHandler from '../events-handler';
import type { ComponentsList, Config } from '../../../types';
import pLimit from '../../../utils/pLimit';

export default function componentsList(conf: Config, cdn: StorageAdapter) {
  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components.json`;

  const componentsList = {
    getFromJson: (): Promise<ComponentsList> => cdn.getJson(filePath(), true),

    getFromDirectories: async (
      jsonList: ComponentsList | null
    ): Promise<ComponentsList> => {
      const componentsInfo: Record<string, string[]> = {};

      const validateComponentVersion = (
        componentName: string,
        componentVersion: string
      ) => {
        return cdn
          .getJson(
            // Check integrity of the package by checking existence of package.json
            // OC will upload always the package.json last when publishing
            `${conf.storage.options.componentsDir}/${componentName}/${componentVersion}/package.json`
          )
          .then(() => true)
          .catch(() => false);
      };

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
                const isValid = await validateComponentVersion(
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
