import fs from 'fs-extra';
import { promisify } from 'util';
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
import { Cdn, Component, Config, Repository } from '../../types';

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
    getComponentVersions(componentName: string): Promise<string[]> {
      if (componentName === 'oc-client') {
        return Promise.all([
          fs
            .readJson(path.join(__dirname, '../../../package.json'))
            .then(x => x.version)
        ]);
      }

      if (!_.includes(local.getComponents(), componentName)) {
        return Promise.reject(
          strings.errors.registry.COMPONENT_NOT_FOUND(
            componentName,
            repositorySource
          )
        );
      }

      return Promise.all([
        fs
          .readJson(path.join(conf.path, `${componentName}/package.json`))
          .then(x => x.version)
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
    getCompiledView(componentName: string, componentVersion: string) {
      if (conf.local) {
        return Promise.resolve(local.getCompiledView(componentName));
      }

      return promisify(cdn.getFile)(
        getFilePath(componentName, componentVersion, 'template.js')
      );
    },
    async getComponent(componentName: string, componentVersion?: string) {
      const allVersions = await repository.getComponentVersions(componentName);

      if (allVersions.length === 0) {
        throw strings.errors.registry.COMPONENT_NOT_FOUND(
          componentName,
          repositorySource
        );
      }

      const version = versionHandler.getAvailableVersion(
        componentVersion,
        allVersions
      );

      if (!version) {
        throw strings.errors.registry.COMPONENT_VERSION_NOT_FOUND(
          componentName,
          componentVersion || '',
          repositorySource
        );
      }

      const component = await repository
        .getComponentInfo(componentName, version)
        .catch(err => {
          throw `component not available: ${errorToString(err)}`;
        });

      return Object.assign(component, { allVersions });
    },
    getComponentInfo(componentName: string, componentVersion: string) {
      if (conf.local) {
        let componentInfo: Component;

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
          return Promise.resolve(componentInfo);
        } else {
          // eslint-disable-next-line prefer-promise-reject-errors
          return Promise.reject('version not available');
        }
      }

      return promisify(cdn.getJson)<Component>(
        getFilePath(componentName, componentVersion, 'package.json'),
        false
      );
    },
    getComponentPath(componentName: string, componentVersion: string) {
      const prefix = conf.local
        ? conf.baseUrl
        : `${options!['path']}${options!.componentsDir}/`;
      return `${prefix}${componentName}/${componentVersion}/`;
    },
    async getComponents() {
      if (conf.local) {
        return local.getComponents();
      }

      const { components } = await componentsCache.get();
      return Object.keys(components);
    },
    getComponentsDetails() {
      if (conf.local) {
        // when in local this won't get called
        return Promise.resolve(null) as any;
      }

      return componentsDetails.get();
    },
    async getComponentVersions(componentName: string) {
      if (conf.local) {
        return local.getComponentVersions(componentName);
      }

      const res = await componentsCache.get();

      return _.has(res.components, componentName)
        ? res.components[componentName]
        : [];
    },
    async getDataProvider(componentName: string, componentVersion: string) {
      if (conf.local) {
        return local.getDataProvider(componentName);
      }

      const filePath = getFilePath(
        componentName,
        componentVersion,
        'server.js'
      );

      const content = await promisify(cdn.getFile)(filePath);

      return { content, filePath };
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
    async init() {
      if (conf.local) {
        // when in local this won't get called
        return 'ok' as any;
      }

      const componentsList = await componentsCache.load();

      return componentsDetails.refresh(componentsList);
    },
    async publishComponent(
      pkgDetails: any,
      componentName: string,
      componentVersion: string
    ) {
      if (conf.local) {
        throw {
          code: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED_CODE,
          msg: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED
        };
      }

      if (!validator.validateComponentName(componentName)) {
        throw {
          code: strings.errors.registry.COMPONENT_NAME_NOT_VALID_CODE,
          msg: strings.errors.registry.COMPONENT_NAME_NOT_VALID
        };
      }

      if (!validator.validateVersion(componentVersion)) {
        throw {
          code: strings.errors.registry.COMPONENT_VERSION_NOT_VALID_CODE,
          msg: strings.errors.registry.COMPONENT_VERSION_NOT_VALID(
            componentVersion
          )
        };
      }

      const validationResult = validator.validatePackageJson(
        Object.assign(pkgDetails, {
          componentName,
          customValidator: conf.publishValidation
        })
      );

      if (!validationResult.isValid) {
        throw {
          code: strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL_CODE,
          msg: strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL(
            String(validationResult.error)
          )
        };
      }

      const componentVersions = await repository.getComponentVersions(
        componentName
      );

      if (
        !versionHandler.validateNewVersion(componentVersion, componentVersions)
      ) {
        throw {
          code: strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND_CODE,
          msg: strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND(
            componentName,
            componentVersion,
            repositorySource
          )
        };
      }

      pkgDetails.packageJson.oc.date = getUnixUtcTimestamp();

      await fs.writeJson(
        path.join(pkgDetails.outputFolder, 'package.json'),
        pkgDetails.packageJson
      );

      await promisify(cdn.putDir)(
        pkgDetails.outputFolder,
        `${options!.componentsDir}/${componentName}/${componentVersion}`
      );

      const componentsList = await componentsCache.refresh();
      return componentsDetails.refresh(componentsList);
    }
  };

  return repository;
}
