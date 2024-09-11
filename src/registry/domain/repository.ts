import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import getUnixUtcTimestamp from 'oc-get-unix-utc-timestamp';

import type { StorageAdapter } from 'oc-storage-adapters-utils';
import strings from '../../resources';
import settings from '../../resources/settings';
import type {
  Component,
  ComponentsDetails,
  Config,
  TemplateInfo
} from '../../types';
import errorToString from '../../utils/error-to-string';
import ComponentsCache from './components-cache';
import getComponentsDetails from './components-details';
import registerTemplates from './register-templates';
import getPromiseBasedAdapter from './storage-adapter';
import * as validator from './validators';
import * as versionHandler from './version-handler';

const readJsonSync = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const readJson = (path: string) => fs.readFile(path, 'utf8').then(JSON.parse);
const writeJson = (path: string, data: unknown) =>
  fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
const packageInfo = readJsonSync(
  path.join(__dirname, '..', '..', '..', 'package.json')
);

export default function repository(conf: Config) {
  const cdn: StorageAdapter =
    !conf.local &&
    (getPromiseBasedAdapter(conf.storage.adapter(conf.storage.options)) as any);
  const options = !conf.local ? conf.storage.options : null;
  const repositorySource = conf.local
    ? 'local repository'
    : cdn.adapterType + ' cdn';
  const componentsCache = ComponentsCache(conf, cdn);
  const componentsDetails = getComponentsDetails(conf, cdn);

  const getFilePath = (component: string, version: string, filePath: string) =>
    `${options!.componentsDir}/${component}/${version}/${filePath}`;

  const { templatesHash, templatesInfo } = registerTemplates(
    conf.templates,
    conf.local
  );

  const local = {
    getCompiledView(componentName: string): string {
      if (componentName === 'oc-client') {
        return readFileSync(
          path.join(
            __dirname,
            '../../components/oc-client/_package/template.js',
            'utf-8'
          )
        ).toString();
      }

      return readFileSync(
        path.join(conf.path, `${componentName}/_package/template.js`),
        'utf-8'
      ).toString();
    },
    getComponents(): string[] {
      const validComponents =
        conf.components ||
        readdirSync(conf.path).filter((file) => {
          const isDir = lstatSync(path.join(conf.path, file)).isDirectory();
          const isValidComponent = isDir
            ? readdirSync(path.join(conf.path, file)).filter(
                (file) => file === '_package'
              ).length === 1
            : false;

          return isValidComponent;
        });

      return [...validComponents, 'oc-client'];
    },
    getComponentVersions(componentName: string): Promise<string[]> {
      if (componentName === 'oc-client') {
        return Promise.all([
          readJson(path.join(__dirname, '../../../package.json')).then(
            (x) => x.version
          )
        ]);
      }

      if (!local.getComponents().includes(componentName)) {
        return Promise.reject(
          strings.errors.registry.COMPONENT_NOT_FOUND(
            componentName,
            repositorySource
          )
        );
      }

      return Promise.all([
        readJson(path.join(conf.path, `${componentName}/package.json`)).then(
          (x) => x.version
        )
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
        content: readFileSync(filePath).toString(),
        filePath
      };
    },
    getEnv(componentName: string): Record<string, string> {
      const pkg: Component = readJsonSync(
        path.join(conf.path, `${componentName}/package.json`)
      );
      const filePath = path.join(conf.path, componentName, pkg.oc.files.env!);

      return dotenv.parse(readFileSync(filePath).toString());
    }
  };

  const repository = {
    getCompiledView(
      componentName: string,
      componentVersion: string
    ): Promise<string> {
      if (conf.local) {
        return Promise.resolve(local.getCompiledView(componentName));
      }

      return cdn.getFile(
        getFilePath(componentName, componentVersion, 'template.js')
      );
    },
    async getComponent(
      componentName: string,
      componentVersion?: string
    ): Promise<Component> {
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
        .catch((err) => {
          throw `component not available: ${errorToString(err)}`;
        });

      return Object.assign(component, { allVersions });
    },
    getComponentInfo(
      componentName: string,
      componentVersion: string
    ): Promise<Component> {
      if (conf.local) {
        let componentInfo: Component;

        if (componentName === 'oc-client') {
          componentInfo = readJsonSync(
            path.join(
              __dirname,
              '../../components/oc-client/_package/package.json'
            )
          );
        } else {
          componentInfo = readJsonSync(
            path.join(conf.path, `${componentName}/_package/package.json`)
          );
        }

        if (componentInfo.version === componentVersion) {
          return Promise.resolve(componentInfo);
        }
        return Promise.reject('version not available');
      }

      return cdn.getJson<Component>(
        getFilePath(componentName, componentVersion, 'package.json'),
        false
      );
    },
    getComponentPath(componentName: string, componentVersion: string): string {
      const prefix = conf.local
        ? conf.baseUrl
        : `${options!['path']}${options!.componentsDir}/`;
      return `${prefix}${componentName}/${componentVersion}/`;
    },
    async getComponents(): Promise<string[]> {
      if (conf.local) {
        return local.getComponents();
      }

      const { components } = await componentsCache.get();
      return Object.keys(components);
    },
    getComponentsDetails(): Promise<ComponentsDetails> {
      if (conf.local) {
        // when in local this won't get called
        return Promise.resolve(null) as any;
      }

      return componentsDetails.get();
    },
    async getComponentVersions(componentName: string): Promise<string[]> {
      if (conf.local) {
        return local.getComponentVersions(componentName);
      }

      const res = await componentsCache.get();

      return res.components[componentName] ? res.components[componentName] : [];
    },
    async getDataProvider(
      componentName: string,
      componentVersion: string
    ): Promise<{
      content: string;
      filePath: string;
    }> {
      if (conf.local) {
        return local.getDataProvider(componentName);
      }

      const filePath = getFilePath(
        componentName,
        componentVersion,
        'server.js'
      );

      const content = await cdn.getFile(filePath);

      return { content, filePath };
    },
    async getEnv(
      componentName: string,
      componentVersion: string
    ): Promise<Record<string, string>> {
      if (conf.local) {
        return local.getEnv(componentName);
      }

      const filePath = getFilePath(componentName, componentVersion, '.env');
      const file = await cdn.getFile(filePath);

      return dotenv.parse(file);
    },
    getStaticClientPath: (dev?: boolean): string =>
      `${options!['path']}${getFilePath(
        'oc-client',
        packageInfo.version,
        dev ? 'src/oc-client.js' : 'src/oc-client.min.js'
      )}`,

    getStaticClientMapPath: (): string =>
      `${options!['path']}${getFilePath(
        'oc-client',
        packageInfo.version,
        'src/oc-client.min.map'
      )}`,

    getStaticFilePath: (
      componentName: string,
      componentVersion: string,
      filePath: string
    ): string =>
      `${repository.getComponentPath(componentName, componentVersion)}${
        conf.local ? settings.registry.localStaticRedirectorPath : ''
      }${filePath}`,

    getTemplatesInfo: (): TemplateInfo[] => templatesInfo,
    getTemplate: (type: string) => templatesHash[type],
    async init(): Promise<ComponentsDetails | undefined> {
      if (conf.local) {
        // when in local this won't get called
        return;
      }

      const componentsList = await componentsCache.load();

      return componentsDetails.refresh(componentsList);
    },
    async publishComponent({
      componentName,
      componentVersion,
      pkgDetails,
      dryRun = false
    }: {
      pkgDetails: { outputFolder: string; packageJson: Component };
      componentName: string;
      componentVersion: string;
      dryRun?: boolean;
    }): Promise<void> {
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

      const componentVersions =
        await repository.getComponentVersions(componentName);

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

      if (dryRun) return;

      await writeJson(
        path.join(pkgDetails.outputFolder, 'package.json'),
        pkgDetails.packageJson
      );

      await cdn.putDir(
        pkgDetails.outputFolder,
        `${options!.componentsDir}/${componentName}/${componentVersion}`
      );

      const componentsList = await componentsCache.refresh();
      await componentsDetails.refresh(componentsList);
    }
  };

  return repository;
}

export type Repository = ReturnType<typeof repository>;
