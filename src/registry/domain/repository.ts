import fs from 'fs-extra';
import getUnixUtcTimestamp from 'oc-get-unix-utc-timestamp';
import path from 'path';
import _ from 'lodash';

import ComponentsCache from './components-cache';
import getComponentsDetails from './components-details';
import registerTemplates from './register-templates';
import settings from '../../resources/settings';
import strings from '../../resources';
import * as validator from './validators';
import * as versionHandler from './version-handler';
import errorToString from '../../utils/error-to-string';
import {
  Cdn,
  Component,
  ComponentsDetails,
  ComponentsList,
  Config,
  Repository
} from '../../types';

const packageInfo = fs.readJsonSync(
  path.join(__dirname, '..', '..', '..', 'package.json')
);

export default function repository(conf: Config): Repository {
  const cdn: Cdn = !conf.local && conf.storage.adapter(conf.storage.options);
  const options = !conf.local ? conf.storage.options : null;
  const repositorySource = conf.local
    ? 'local repository'
    : cdn.adapterType + ' cdn';
  const componentsCache = ComponentsCache(conf, cdn);
  const componentsDetails = getComponentsDetails(conf, cdn);

  const getFilePath = (component: string, version: string, filePath: string) =>
    `${options!.componentsDir}/${component}/${version}/${filePath}`;

  const { templatesHash, templatesInfo } = registerTemplates(conf.templates);

  const local = {
    getCompiledView(componentName: string): string {
      if (componentName === 'oc-client') {
        return fs
          .readFileSync(
            path.join(
              __dirname,
              '../../components/oc-client/_package/template.js'
            )
          )
          .toString();
      }

      return fs
        .readFileSync(
          path.join(conf.path, `${componentName}/_package/template.js`)
        )
        .toString();
    },
    getComponents(): string[] {
      const validComponents = fs.readdirSync(conf.path).filter(file => {
        const isDir = fs.lstatSync(path.join(conf.path, file)).isDirectory();
        const isValidComponent = isDir
          ? fs
              .readdirSync(path.join(conf.path, file))
              .filter(file => file === '_package').length === 1
          : false;

        return isValidComponent;
      });

      validComponents.push('oc-client');
      return validComponents;
    },
    getComponentVersions(
      componentName: string,
      callback: (err: string | null, data: string[]) => void
    ) {
      if (componentName === 'oc-client') {
        return callback(null, [
          fs.readJsonSync(path.join(__dirname, '../../../package.json')).version
        ]);
      }

      if (!_.includes(local.getComponents(), componentName)) {
        return callback(
          strings.errors.registry.COMPONENT_NOT_FOUND(
            componentName,
            repositorySource
          ),
          undefined as any
        );
      }

      callback(null, [
        fs.readJsonSync(path.join(conf.path, `${componentName}/package.json`))
          .version
      ]);
    },
    getDataProvider(componentName: string) {
      const ocClientServerPath =
        '../../components/oc-client/_package/server.js';
      const filePath =
        componentName === 'oc-client'
          ? path.join(__dirname, ocClientServerPath)
          : path.join(conf.path, `${componentName}/_package/server.js`);

      return {
        content: fs.readFileSync(filePath).toString(),
        filePath
      };
    }
  };

  const repository = {
    getCompiledView(
      componentName: string,
      componentVersion: string,
      callback: (err: Error | null, data: string) => void
    ) {
      if (conf.local) {
        return callback(null, local.getCompiledView(componentName));
      }

      cdn.getFile(
        getFilePath(componentName, componentVersion, 'template.js'),
        callback
      );
    },
    getComponent(
      componentName: string,
      componentVersionOrCallback:
        | string
        | ((err: string | null, data: Component) => void),
      callbackMaybe?: (err: string | null, data: Component) => void
    ) {
      const componentVersion: string | undefined =
        typeof componentVersionOrCallback === 'function'
          ? undefined
          : (componentVersionOrCallback as any);
      const callback: (err: string | null, data: Component) => void =
        typeof componentVersionOrCallback === 'function'
          ? (componentVersionOrCallback as any)
          : callbackMaybe!;

      repository.getComponentVersions(componentName, (err, allVersions) => {
        if (err) {
          return callback(err, undefined as any);
        }

        if (allVersions.length === 0) {
          return callback(
            strings.errors.registry.COMPONENT_NOT_FOUND(
              componentName,
              repositorySource
            ),
            undefined as any
          );
        }

        const version = versionHandler.getAvailableVersion(
          componentVersion,
          allVersions
        );

        if (!version) {
          return callback(
            strings.errors.registry.COMPONENT_VERSION_NOT_FOUND(
              componentName,
              componentVersion || '',
              repositorySource
            ),
            undefined as any
          );
        }

        repository.getComponentInfo(
          componentName,
          version,
          (err, component) => {
            if (err) {
              return callback(
                `component not available: ${errorToString(err)}`,
                null as any
              );
            }
            callback(null, Object.assign(component, { allVersions }));
          }
        );
      });
    },
    getComponentInfo(
      componentName: string,
      componentVersion: string,
      callback: (err: string | null, data: Component) => void
    ) {
      if (conf.local) {
        let componentInfo;

        if (componentName === 'oc-client') {
          componentInfo = fs.readJsonSync(
            path.join(
              __dirname,
              '../../components/oc-client/_package/package.json'
            )
          );
        } else {
          componentInfo = fs.readJsonSync(
            path.join(conf.path, `${componentName}/_package/package.json`)
          );
        }

        if (componentInfo.version === componentVersion) {
          return callback(null, componentInfo);
        } else {
          return callback('version not available', undefined as any);
        }
      }

      cdn.getJson<Component>(
        getFilePath(componentName, componentVersion, 'package.json'),
        callback
      );
    },
    getComponentPath(componentName: string, componentVersion: string) {
      const prefix = conf.local
        ? conf.baseUrl
        : `${options!['path']}${options!.componentsDir}/`;
      return `${prefix}${componentName}/${componentVersion}/`;
    },
    getComponents(callback: (err: Error | null, data: string[]) => void) {
      if (conf.local) {
        return callback(null, local.getComponents());
      }

      componentsCache.get((err, res) =>
        callback(err, res ? Object.keys(res.components) : (null as any))
      );
    },
    getComponentsDetails(
      callback: (err: string | null, data: ComponentsDetails) => void
    ) {
      if (conf.local) {
        return (callback as any)();
      }

      componentsDetails.get(callback);
    },
    getComponentVersions(
      componentName: string,
      callback: (err: string | null, data: string[]) => void
    ) {
      if (conf.local) {
        return local.getComponentVersions(componentName, callback);
      }

      componentsCache.get((err, res) => {
        callback(
          err as any,
          !!res && !!_.has(res.components, componentName)
            ? res.components[componentName]
            : []
        );
      });
    },
    getDataProvider(
      componentName: string,
      componentVersion: string,
      callback: (
        err: Error | null,
        data: {
          content: string;
          filePath: string;
        }
      ) => void
    ) {
      if (conf.local) {
        return callback(null, local.getDataProvider(componentName));
      }

      const filePath = getFilePath(
        componentName,
        componentVersion,
        'server.js'
      );

      cdn.getFile(filePath, (err, content: string) =>
        callback(err, content ? { content, filePath } : (null as any))
      );
    },
    getStaticClientPath: () =>
      `${options!['path']}${getFilePath(
        'oc-client',
        packageInfo.version,
        'src/oc-client.min.js'
      )}`,

    getStaticClientMapPath: () =>
      `${options!['path']}${getFilePath(
        'oc-client',
        packageInfo.version,
        'src/oc-client.min.map'
      )}`,

    getStaticFilePath: (
      componentName: string,
      componentVersion: string,
      filePath: string
    ) =>
      `${repository.getComponentPath(componentName, componentVersion)}${
        conf.local ? settings.registry.localStaticRedirectorPath : ''
      }${filePath}`,

    getTemplatesInfo: () => templatesInfo,
    getTemplate: (type: string) => templatesHash[type],

    init(callback: (err: Error | null, data: ComponentsList | string) => void) {
      if (conf.local) {
        return callback(null, 'ok');
      }

      componentsCache.load((err, componentsList) => {
        if (err) {
          return callback(err, undefined as any);
        }
        componentsDetails.refresh(componentsList, err =>
          callback(err, componentsList)
        );
      });
    },
    publishComponent(
      pkgDetails: any,
      componentName: string,
      componentVersion: string,
      callback: (
        err: { code: string; msg: string } | null,
        data: ComponentsDetails
      ) => void
    ) {
      if (conf.local) {
        return callback(
          {
            code: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED_CODE,
            msg: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED
          },
          undefined as any
        );
      }

      if (!validator.validateComponentName(componentName)) {
        return callback(
          {
            code: strings.errors.registry.COMPONENT_NAME_NOT_VALID_CODE,
            msg: strings.errors.registry.COMPONENT_NAME_NOT_VALID
          },
          undefined as any
        );
      }

      if (!validator.validateVersion(componentVersion)) {
        return callback(
          {
            code: strings.errors.registry.COMPONENT_VERSION_NOT_VALID_CODE,
            msg: strings.errors.registry.COMPONENT_VERSION_NOT_VALID(
              componentVersion
            )
          },
          undefined as any
        );
      }

      const validationResult = validator.validatePackageJson(
        Object.assign(pkgDetails, {
          componentName,
          customValidator: conf.publishValidation
        })
      );

      if (!validationResult.isValid) {
        return callback(
          {
            code: strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL_CODE,
            msg: strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL(
              String(validationResult.error)
            )
          },
          undefined as any
        );
      }

      repository.getComponentVersions(
        componentName,
        (_err, componentVersions) => {
          if (
            !versionHandler.validateNewVersion(
              componentVersion,
              componentVersions
            )
          ) {
            return callback(
              {
                code: strings.errors.registry
                  .COMPONENT_VERSION_ALREADY_FOUND_CODE,
                msg: strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND(
                  componentName,
                  componentVersion,
                  repositorySource
                )
              },
              undefined as any
            );
          }

          pkgDetails.packageJson.oc.date = getUnixUtcTimestamp();
          fs.writeJSON(
            path.join(pkgDetails.outputFolder, 'package.json'),
            pkgDetails.packageJson,
            err => {
              if (err) {
                return callback(err as any, undefined as any);
              }
              cdn.putDir(
                pkgDetails.outputFolder,
                `${
                  options!.componentsDir
                }/${componentName}/${componentVersion}`,
                err => {
                  if (err) {
                    return callback(err as any, undefined as any);
                  }
                  componentsCache.refresh((err, componentsList) => {
                    if (err) {
                      return callback(err as any, undefined as any);
                    }
                    componentsDetails.refresh(componentsList, callback as any);
                  });
                }
              );
            }
          );
        }
      );
    }
  };

  return repository;
}
