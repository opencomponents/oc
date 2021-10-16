import { promisify } from 'util';
import semver from 'semver';
import pLimit from 'p-limit';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import { Cdn, ComponentsList, Config } from '../../../types';

export default function componentsList(conf: Config, cdn: Cdn) {
  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components.json`;

  const componentsList = {
    getFromJson: (): Promise<ComponentsList> =>
      promisify(cdn.getJson)(filePath(), true),

    getFromDirectories: async (): Promise<ComponentsList> => {
      const componentsInfo: Dictionary<string[]> = {};

      const getVersionsForComponent = async (
        componentName: string
      ): Promise<string[]> => {
        const versions = await promisify(cdn.listSubDirectories)(
          `${conf.storage.options.componentsDir}/${componentName}`
        );

        return versions.sort(semver.compare);
      };

      try {
        const components = await promisify(cdn.listSubDirectories)(
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
      } catch (err: any) {
        if (err.code === 'dir_not_found') {
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
      promisify(cdn.putFileContent)(JSON.stringify(data), filePath(), true)
  };

  return componentsList;
}
