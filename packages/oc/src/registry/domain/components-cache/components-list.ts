import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import semver from 'semver';
import type { ComponentsList, Config } from '../../../types';
import mapWithConcurrency from '../../../utils/map-with-concurrency';
import eventsHandler from '../events-handler';

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

      try {
        const components = await cdn.listSubDirectories(
          conf.storage.options.componentsDir
        );

        // Phase 1: fetch per-component version directories with a shared budget
        const allVersionsList = await mapWithConcurrency(
          components,
          cdn.maxConcurrentRequests,
          (componentName) =>
            cdn.listSubDirectories(
              `${conf.storage.options.componentsDir}/${componentName}`
            )
        );

        // Derive compact unchecked descriptors after version-list slots are released
        type Descriptor = {
          componentName: string;
          version: string;
          componentIndex: number;
        };
        const descriptors: Descriptor[] = [];
        for (let i = 0; i < components.length; i++) {
          const componentName = components[i] as string;
          const allVersions = allVersionsList[i] as string[];
          const unchecked = allVersions.filter(
            (version) => !jsonList?.components[componentName]?.includes(version)
          );
          for (const version of unchecked) {
            descriptors.push({ componentName, version, componentIndex: i });
          }
        }

        // Phase 2: validate package integrity with the same shared budget
        const validationResults =
          descriptors.length > 0
            ? await mapWithConcurrency(
                descriptors,
                cdn.maxConcurrentRequests,
                async (desc) => {
                  const isValid = await validateComponentVersion(
                    desc.componentName,
                    desc.version
                  );
                  return { ...desc, isValid };
                }
              )
            : [];

        const invalidByComponent = new Map<number, string[]>();
        for (const result of validationResults) {
          if (!result.isValid) {
            const list = invalidByComponent.get(result.componentIndex);
            if (list) {
              list.push(result.version);
            } else {
              invalidByComponent.set(result.componentIndex, [result.version]);
            }
          }
        }

        const versions: string[][] = [];
        for (let i = 0; i < components.length; i++) {
          const componentName = components[i] as string;
          const allVersions = allVersionsList[i] as string[];
          const invalidVersions = invalidByComponent.get(i) ?? [];
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
          versions[i] = validVersions.sort(semver.compare);
        }

        components.forEach((component, i) => {
          componentsInfo[component] = versions[i] as string[];
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
