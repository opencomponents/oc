import semver from 'semver';
import pLimit from 'p-limit';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import { ComponentsList, Config } from '../../../types';
import { StorageAdapter } from 'oc-storage-adapters-utils';
import { toOcError } from '../../../utils/errors';

export default function componentsList(conf: Config, cdn: StorageAdapter) {
  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components.json`;

  const componentsList = {
    getFromJson: (): Promise<ComponentsList> => cdn.getJson(filePath(), true),

    getFromDirectories: async (): Promise<ComponentsList> => {
      const componentsInfo: Record<string, string[]> = {};

      const getVersionsForComponent = async (
        componentName: string
      ): Promise<string[]> => {
        const versions = await cdn.listSubDirectories(
          `${conf.storage.options.componentsDir}/${componentName}`
        );

        return versions.sort(semver.compare);
      };

      try {
        const components = await cdn.listSubDirectories(
          conf.storage.options.componentsDir
        );
        const limit = pLimit(cdn.maxConcurrentRequests);

        const versions = await Promise.all(
          components.map(component =>
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
      } catch (err: unknown) {
        const error = toOcError(err);
        if (error.code === 'dir_not_found') {
          throw {
            lastEdit: getUnixUTCTimestamp(),
            components: [] as any
          };
        }
        throw err;
      }
    },

    async refresh(): Promise<ComponentsList> {
      const components = await componentsList.getFromDirectories();
      await componentsList.save(components);

      return components;
    },

    save: (data: ComponentsList): Promise<unknown> =>
      cdn.putFileContent(JSON.stringify(data), filePath(), true)
  };

  return componentsList;
}
