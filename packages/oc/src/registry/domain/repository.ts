import path from 'node:path';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import getUnixUtcTimestamp from 'oc-get-unix-utc-timestamp';
import {
  VERSION_ALREADY_EXISTS,
  VERSION_PUBLISH_IN_PROGRESS
} from 'oc-metadata-adapters-utils';

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
import eventsHandler from './events-handler';
import getMetadataAdapterOptions from './metadata-adapter-options';
import { createMetadataIndex, getComponentRow } from './metadata-index';
import {
  exportLegacyMetadataFiles,
  reconcileMetadataFromStorage
} from './metadata-migration';
import registerTemplates from './register-templates';
import getPromiseBasedAdapter from './storage-adapter';
import * as validator from './validators';
import * as versionHandler from './version-handler';

const packageInfo = fs.readJsonSync(
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
  const metadataStore =
    !conf.local && conf.metadata
      ? conf.metadata.adapter(getMetadataAdapterOptions(conf))
      : undefined;
  const metadataIndex = metadataStore
    ? createMetadataIndex(metadataStore)
    : undefined;
  const componentsCache = ComponentsCache(conf, cdn, metadataIndex);
  const componentsDetails = getComponentsDetails(conf, cdn, metadataIndex);
  let exportLegacyFilesLoop: NodeJS.Timeout | undefined;
  let closed = false;

  const getFilePath = (component: string, version: string, filePath: string) =>
    `${options!.componentsDir}/${component}/${version}/${filePath}`;

  const exportLegacyFiles = () => {
    if (!metadataStore || !conf.metadata?.exportLegacyFiles) {
      return;
    }

    return exportLegacyMetadataFiles({
      metadataStore,
      cdn,
      componentsDir: options!.componentsDir
    }).catch((err: any) =>
      eventsHandler.fire('error', {
        code: 'metadata_legacy_files_export',
        message: err?.message || String(err)
      })
    );
  };

  // Run the DB→components.json export on a non-overlapping background timer
  // instead of on the publish path, so a publish stays an O(1) append rather
  // than triggering a full-registry scan + blob rewrite. The timer only runs
  // when an interval is explicitly configured.
  const scheduleLegacyFilesExport = () => {
    const intervalSeconds = conf.metadata?.exportLegacyFilesInterval;
    if (
      closed ||
      !metadataStore ||
      !conf.metadata?.exportLegacyFiles ||
      !intervalSeconds
    ) {
      return;
    }

    exportLegacyFilesLoop = setTimeout(async () => {
      await exportLegacyFiles();
      if (!closed) {
        scheduleLegacyFilesExport();
      }
    }, intervalSeconds * 1000);
  };

  const { templatesHash, templatesInfo } = registerTemplates(
    conf.templates,
    conf.local
  );

  const throwVersionAlreadyFound = (
    componentName: string,
    componentVersion: string
  ) => {
    throw {
      code: strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND_CODE,
      msg: strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND(
        componentName,
        componentVersion,
        repositorySource
      )
    };
  };

  const local = {
    components: undefined as string[] | undefined,
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
      if (conf.hotReloading === false && local.components) {
        return local.components;
      }

      const validComponents = conf.components
        ? conf.components
        : fs.readdirSync(conf.path).filter((file) => {
            const isDir = fs
              .lstatSync(path.join(conf.path, file))
              .isDirectory();
            const isValidComponent = isDir
              ? fs
                  .readdirSync(path.join(conf.path, file))
                  .filter((file) => file === '_package').length === 1
              : false;

            return isValidComponent;
          });

      const components = [...validComponents, 'oc-client'];
      if (conf.hotReloading === false) {
        local.components = components;
      }

      return components;
    },
    getComponentVersions(componentName: string): Promise<string[]> {
      if (componentName === 'oc-client') {
        return Promise.all([
          fs
            .readJson(path.join(__dirname, '../../../package.json'))
            .then((x) => x.version)
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
        fs
          .readJson(path.join(conf.path, `${componentName}/package.json`))
          .then((x) => x.version)
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
    },
    getEnv(componentName: string): Record<string, string> {
      const pkg: Component = fs.readJsonSync(
        path.join(conf.path, `${componentName}/package.json`)
      );
      const filePath = path.join(conf.path, componentName, pkg.oc.files.env!);

      return dotenv.parse(fs.readFileSync(filePath).toString());
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

      if (metadataStore) {
        await metadataStore.initialise();
        if (conf.metadata?.reconcileFromStorage) {
          await reconcileMetadataFromStorage({
            metadataStore,
            cdn,
            componentsDir: options!.componentsDir
          });
        }
      }

      const componentsList = await componentsCache.load();
      const details = await componentsDetails.refresh(componentsList);

      void exportLegacyFiles();
      scheduleLegacyFilesExport();

      return details;
    },
    async publishComponent({
      componentName,
      componentVersion,
      pkgDetails,
      user,
      dryRun = false
    }: {
      pkgDetails: { outputFolder: string; packageJson: Component };
      componentName: string;
      componentVersion: string;
      dryRun?: boolean;
      user?: string;
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
          context: { user },
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
        throwVersionAlreadyFound(componentName, componentVersion);
      }

      pkgDetails.packageJson.oc.date = getUnixUtcTimestamp();
      pkgDetails.packageJson.oc.publisher = user;

      if (dryRun) return;

      await fs.writeJson(
        path.join(pkgDetails.outputFolder, 'package.json'),
        pkgDetails.packageJson
      );

      if (metadataStore) {
        const componentRow = getComponentRow(
          componentName,
          componentVersion,
          pkgDetails.packageJson
        );
        const { token } = await metadataStore
          .reserveVersion(componentRow)
          .catch((err: any) => {
            if (
              err?.code === VERSION_ALREADY_EXISTS ||
              err?.code === VERSION_PUBLISH_IN_PROGRESS ||
              err?.code ===
                strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND_CODE
            ) {
              throwVersionAlreadyFound(componentName, componentVersion);
            }

            throw err;
          });

        try {
          await cdn.putDir(
            pkgDetails.outputFolder,
            `${options!.componentsDir}/${componentName}/${componentVersion}`
          );
          await metadataStore.commitVersion(
            componentName,
            componentVersion,
            token
          );
          metadataIndex!.add(componentRow);
        } catch (err) {
          await metadataStore
            .abortVersion(componentName, componentVersion, token)
            .catch(() => undefined);
          throw err;
        }
        return;
      }

      await cdn.putDir(
        pkgDetails.outputFolder,
        `${options!.componentsDir}/${componentName}/${componentVersion}`
      );

      void componentsCache
        .refresh()
        .then((componentsList) => componentsDetails.refresh(componentsList))
        .catch(() => undefined);
    },
    async close(): Promise<void> {
      closed = true;
      componentsCache.close?.();
      componentsDetails.close?.();
      if (exportLegacyFilesLoop) {
        clearTimeout(exportLegacyFilesLoop);
        exportLegacyFilesLoop = undefined;
      }
      if (metadataStore?.close) {
        await metadataStore.close();
      }
    }
  };

  return repository;
}

export type Repository = ReturnType<typeof repository>;
