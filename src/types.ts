import { NextFunction, Request, Response } from 'express';
import { Logger } from './cli/logger';
import { PackageJson } from 'type-fest';

export interface Author {
  email?: string;
  name?: string;
  url?: string;
}

interface ComponentList {
  author: Author;
  name: string;
  state: string;
}

interface ComponentHistory {
  name: string;
  publishDate: string;
  version: string;
}

export interface TemplateInfo {
  externals: Array<{
    name: string;
    global: string | string[];
    url: string;
  }>;
  type: string;
  version: string;
}

export interface ComponentsDetails {
  components: {
    [componentName: string]: {
      [componentVersion: string]: { publishDate: number };
    };
  };
  lastEdit: number;
}

export interface ComponentsList {
  components: Dictionary<string[]>;
  lastEdit: number;
}

export interface OcParameter {
  default?: string | boolean | number;
  description?: string;
  example?: string;
  mandatory?: boolean;
  type: 'string' | 'boolean' | 'number';
}

interface OcConfiguration {
  container?: boolean;
  date: number;
  files: {
    dataProvider: {
      hashKey: string;
      src: string;
      type: string;
    };
    static: string[];
    template: {
      hashKey: string;
      src: string;
      type: string;
      version: string;
    };
  };
  packaged: boolean;
  parameters: Record<string, OcParameter>;
  plugins?: string[];
  renderInfo?: boolean;
  state?: 'deprecated' | 'experimental';
  stringifiedDate: string;
  version: string;
}

export interface Component extends PackageJson {
  allVersions: string[];
  name: string;
  oc: OcConfiguration;
  version: string;
}

export interface ParsedComponent extends Omit<Component, 'author'> {
  author: Author;
}

export interface VM {
  availableDependencies: Array<{
    core: boolean;
    name: string;
    version: string;
    link: string;
  }>;
  availablePlugins: Record<string, (...args: unknown[]) => void>;
  components: ParsedComponent[];
  componentsHistory?: ComponentHistory[];
  componentsList: ComponentList[];
  componentsReleases: number;
  href: string;
  ocVersion: string;
  q: string;
  stateCounts: {
    deprecated?: number;
    experimental?: number;
  };
  templates: TemplateInfo[];
  title: string;
  type: 'oc-registry' | 'oc-registry-local';
}

export interface Config {
  baseUrl: string;
  baseUrlFunc?: (opts: { host?: string; secure: boolean }) => string;
  beforePublish: (req: Request, res: Response, next: NextFunction) => void;
  customHeadersToSkipOnWeakVersion: string[];
  dependencies: string[];
  discovery: boolean;
  discoveryFunc?: (opts: { host?: string; secure: boolean }) => boolean;
  env: Dictionary<string>;
  executionTimeout?: number;
  fallbackRegistryUrl: string;
  hotReloading: boolean;
  keepAliveTimeout?: number;
  liveReloadPort: number;
  local: boolean;
  path: string;
  plugins: Record<string, (...args: unknown[]) => void>;
  pollingInterval: number;
  port: number;
  postRequestPayloadSize?: number;
  prefix: string;
  publishAuth?: {
    type: string;
    username: string;
    password: string;
  };
  publishValidation: (data: unknown) =>
    | {
        isValid: boolean;
        error?: string;
      }
    | boolean;
  refreshInterval?: number;
  routes?: Array<{
    route: string;
    method: string;
    handler: (req: Request, res: Response) => void;
  }>;
  s3?: {
    bucket: string;
    region: string;
    key?: string;
    secret?: string;
    componentsDir: string;
  };
  storage: {
    adapter: any;
    options: Dictionary<any> & { componentsDir: string };
  };
  tempDir: string;
  templates: any[];
  timeout: number;
  verbosity: number;
}

export interface Cdn {
  adapterType: string;
  getFile: (filePath: string, cb: Callback<string>) => void;
  getJson<T>(filePath: string, force: boolean, cb: Callback<T, string>): void;
  getJson<T>(filePath: string, cb: Callback<T, string>): void;
  listSubDirectories: (
    dir: string,
    cb: Callback<string[], Error & { code?: string }>
  ) => void;
  maxConcurrentRequests: number;
  putDir: (folderPath: string, filePath: string, cb: Callback) => void;
  putFileContent: (
    data: unknown,
    path: string,
    isPrivate: boolean,
    callback: Callback<unknown, string>
  ) => void;
}

type CompiledTemplate = (model: unknown) => string;

interface CompilerOptions {
  componentPackage: PackageJson & {
    oc: OcConfiguration;
  };
  componentPath: string;
  minify: boolean;
  ocPackage: PackageJson;
  production: boolean;
  publishPath: string;
  verbose: boolean;
  watch: boolean;
}

export interface Template {
  compile?: (options: CompilerOptions, cb: Callback) => void;
  getCompiledTemplate: (
    templateString: string,
    key: string,
    context?: Record<string, unknown>
  ) => CompiledTemplate;
  getInfo: () => TemplateInfo;
  render: (
    options: { model: unknown; template: CompiledTemplate },
    cb: Callback<string>
  ) => void;
}

export interface Plugin {
  callback?: (...args: unknown[]) => void;
  description?: string;
  name: string;
  options?: any;
  register: {
    register: (
      options: unknown,
      dependencies: unknown,
      next: () => void
    ) => void;
    execute: (...args: unknown[]) => unknown;
    dependencies?: string[];
  };
}

export interface RegistryCli {
  add(registry: string, callback: Callback<null, string>): void;
  get(callback: Callback<string[], string>): void;
  getApiComponentByHref(
    href: string,
    callback: Callback<unknown, Error | number>
  ): void;
  getComponentPreviewUrlByUrl(
    componentHref: string,
    callback: Callback<string, Error | number>
  ): void;
  putComponent(
    options: {
      username?: string;
      password?: string;
      route: string;
      path: string;
    },
    callback: Callback<unknown, string>
  ): void;
  remove(registry: string, callback: Callback): void;
}

export interface Local {
  clean: {
    fetchList: (dirPath: string, callback: Callback<string[]>) => void;
    remove: (list: string[], callback: Callback<string>) => void;
  };
  cleanup: (
    compressedPackagePath: string,
    cb: (err: NodeJS.ErrnoException) => void
  ) => void;
  compress: (
    input: string,
    output: string,
    cb: (error: Error | string | null) => void
  ) => void;
  getComponentsByDir: (
    componentsDir: string,
    callback: Callback<string[]>
  ) => void;
  init: (
    options: {
      componentName: string;
      logger: Logger;
      componentPath: string;
      templateType: string;
    },
    callback: Callback<string, string>
  ) => void;
  mock: (
    params: { targetType: string; targetValue: string; targetName: string },
    callback: (err: Error) => void
  ) => void;
  package: (
    options: {
      componentPath: string;
      minify?: boolean;
      verbose?: boolean;
      production?: boolean;
    },
    callback: Callback<Component>
  ) => void;
}

export interface Repository {
  getCompiledView(
    componentName: string,
    componentVersion: string,
    callback: Callback<string>
  ): void;
  getComponent(
    componentName: string,
    componentVersion: string,
    calllback: Callback<Component, string>
  ): void;
  getComponent(
    componentName: string,
    calllback: Callback<Component, string>
  ): void;
  getComponentInfo(
    componentName: string,
    componentVersion: string,
    callback: Callback<Component, string>
  ): void;
  getComponentPath(componentName: string, componentVersion: string): void;
  getComponents(callback: Callback<string[]>): void;
  getComponentsDetails(callback: Callback<ComponentsDetails, string>): void;
  getComponentVersions(
    componentName: string,
    callback: Callback<string[], string>
  ): void;
  getDataProvider(
    componentName: string,
    componentVersion: string,
    callback: Callback<{
      content: string;
      filePath: string;
    }>
  ): void;
  getStaticClientMapPath: () => string;
  getStaticClientPath: () => string;
  getStaticFilePath: (
    componentName: string,
    componentVersion: string,
    filePath: string
  ) => string;
  getTemplate: (type: string) => Template;
  getTemplatesInfo: () => TemplateInfo[];
  init(callback: Callback<ComponentsList | string>): void;
  publishComponent(
    pkgDetails: any,
    componentName: string,
    componentVersion: string,
    callback: Callback<ComponentsDetails, { code: string; msg: string }>
  ): void;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Response {
      conf: Config;
      errorCode?: string;
      errorDetails?: string;
    }
  }
}
