import async from 'async';
import semver from 'semver';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import { Cdn, ComponentsList, Config } from '../../../types';

export default function componentsList(conf: Config, cdn: Cdn) {
  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components.json`;

  const componentsList = {
    getFromJson: (callback: Callback<any>) =>
      cdn.getJson(filePath(), true, callback),

    getFromDirectories: (callback: Callback<ComponentsList, string>) => {
      const componentsInfo = {};

      const getVersionsForComponent = (
        componentName: string,
        cb: Callback<string[]>
      ) => {
        cdn.listSubDirectories(
          `${conf.storage.options.componentsDir}/${componentName}`,
          (err, versions) => {
            if (err) {
              return cb(err, undefined as any);
            }
            cb(null, versions.sort(semver.compare));
          }
        );
      };

      cdn.listSubDirectories(
        conf.storage.options.componentsDir,
        (err, components) => {
          if (err) {
            if (err.code === 'dir_not_found') {
              return callback(null, {
                lastEdit: getUnixUTCTimestamp(),
                components: [] as any
              });
            }

            return callback(err as any, undefined as any);
          }

          async.mapLimit(
            components,
            cdn.maxConcurrentRequests,
            getVersionsForComponent,
            (errors, versions) => {
              if (errors) {
                return callback(errors, undefined as any);
              }

              components.forEach((component, i) => {
                componentsInfo[component] = versions[i];
              });

              callback(null, {
                lastEdit: getUnixUTCTimestamp(),
                components: componentsInfo
              });
            }
          );
        }
      );
    },

    refresh(callback: Callback<ComponentsList, string>) {
      componentsList.getFromDirectories((err, components) => {
        if (err) {
          return callback(err, undefined as any);
        }
        componentsList.save(components, err => {
          if (err) {
            return callback(err, undefined as any);
          }
          callback(err, components);
        });
      });
    },

    save: (data: ComponentsList, callback: Callback<unknown, string>) =>
      cdn.putFileContent(JSON.stringify(data), filePath(), true, callback)
  };

  return componentsList;
}
