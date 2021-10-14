import { NextFunction, Request, Response } from 'express';
import { Logger } from './cli/logger';
import { PackageJson } from 'type-fest';

export interface Author {
  name?: string;
  email?: string;
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
  type: string;
  version: string;
  externals: Array<{
    name: string;
    global: string | string[];
    url: string;
  }>;
}

export interface ComponentsDetails {
  lastEdit: number;
  components: {
    [componentName: string]: {
      [componentVersion: string]: { publishDate: number };
    };
  };
}

export interface ComponentsList {
  lastEdit: number;
  components: Dictionary<string[]>;
}

export interface OcParameter {
  description?: string;
  example?: string;
  mandatory?: boolean;
  type: 'string' | 'boolean' | 'number';
  default?: string | boolean | number;
}

interface OcConfiguration {
  date: number;
  state?: 'deprecated' | 'experimental';
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
  stringifiedDate: string;
  version: string;
  plugins?: string[];
  container?: boolean;
  renderInfo?: boolean;
}

export interface Component extends PackageJson {
  name: string;
  version: string;
  allVersions: string[];
  oc: OcConfiguration;
}

export interface ParsedComponent extends Omit<Component, 'author'> {
  author: Author;
}

export interface VM {
  availablePlugins: Record<string, (...args: unknown[]) => void>;
  availableDependencies: Array<{
    core: boolean;
    name: string;
    version: string;
    link: string;
  }>;
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
  beforePublish: (req: Request, res: Response, next: NextFunction) => void;
  baseUrl: string;
  baseUrlFunc: (opts: { host?: string; secure: boolean }) => string;
  discovery: boolean;
  discoveryFunc: (opts: { host?: string; secure: boolean }) => boolean;
  plugins: Record<string, (...args: unknown[]) => void>;
  local: boolean;
  tempDir: string;
  port: number;
  postRequestPayloadSize?: number;
  verbosity: number;
  prefix: string;
  path: string;
  publishAuth?: {
    type: string;
    username: string;
    password: string;
  };
  dependencies: string[];
  routes?: Array<{
    route: string;
    method: string;
    handler: (req: Request, res: Response) => void;
  }>;
  storage: {
    adapter: any;
    options: Dictionary<any> & { componentsDir: string };
  };
  s3?: {
    bucket: string;
    region: string;
    key?: string;
    secret?: string;
    componentsDir: string;
  };
  customHeadersToSkipOnWeakVersion: string[];
  fallbackRegistryUrl: string;
  pollingInterval: number;
  publishValidation: (data: unknown) =>
    | {
        isValid: boolean;
        error?: string;
      }
    | boolean;
  refreshInterval?: number;
  keepAliveTimeout?: number;
  templates: any[];
  env: Dictionary<string>;
  hotReloading: boolean;
  timeout: number;
  liveReloadPort: number;
  executionTimeout?: number;
}

export interface Cdn {
  getJson<T>(filePath: string, force: boolean, cb: Callback<T, string>): void;
  getFile: (filePath: string, cb: Callback<string>) => void;
  putDir: (folderPath: string, filePath: string, cb: Callback) => void;
  listSubDirectories: (
    dir: string,
    cb: Callback<string[], Error & { code?: string }>
  ) => void;
  putFileContent: (
    data: unknown,
    path: string,
    isPrivate: boolean,
    callback: Callback<unknown, string>
  ) => void;
  maxConcurrentRequests: number;
  adapterType: string;
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
  getInfo: () => TemplateInfo;
  getCompiledTemplate: (
    templateString: string,
    key: string,
    context: Record<string, unknown>
  ) => CompiledTemplate;
  render: (
    options: { model: unknown; template: CompiledTemplate },
    cb: Callback<string>
  ) => void;
  compile?: (options: CompilerOptions, cb: Callback) => void;
}

export interface Plugin {
  name: string;
  register: {
    register: (
      options: unknown,
      dependencies: unknown,
      next: () => void
    ) => void;
    execute: (...args: unknown[]) => unknown;
    dependencies?: string[];
  };
  description?: string;
  options?: any;
  callback?: (...args: unknown[]) => void;
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
    fetchList: (dirPath: string) => Promise<string[]>;
    remove: (list: string[]) => Promise<void>;
  };
  cleanup: (compressedPackagePath: string) => Promise<void>;
  compress: (input: string, output: string) => Promise<void>;
  getComponentsByDir: (componentsDir: string) => Promise<string[]>;
  init: (options: {
    componentName: string;
    logger: Logger;
    componentPath: string;
    templateType: string;
  }) => Promise<void>;
  mock: (params: {
    targetType: string;
    targetValue: string;
    targetName: string;
  }) => Promise<void>;
  package: (options: {
    componentPath: string;
    minify?: boolean;
    verbose?: boolean;
    production?: boolean;
  }) => Promise<Component>;
}

export interface Repository {
  getCompiledView(
    componentName: string,
    componentVersion: string
  ): Promise<string>;
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
    componentVersion: string
  ): Promise<Component>;
  getComponentPath(componentName: string, componentVersion: string): void;
  getComponents(callback: Callback<string[]>): void;
  getComponentsDetails(callback: Callback<ComponentsDetails, string>): void;
  getComponentVersions(
    componentName: string,
    callback: Callback<string[], string>
  ): void;
  getDataProvider(
    componentName: string,
    componentVersion: string
  ): Promise<{
    content: string;
    filePath: string;
  }>;
  getStaticClientPath: () => string;
  getStaticClientMapPath: () => string;
  getStaticFilePath: (
    componentName: string,
    componentVersion: string,
    filePath: string
  ) => string;
  getTemplatesInfo: () => TemplateInfo[];
  getTemplate: (type: string) => Template;
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
      errorDetails?: string;
      errorCode?: string;
    }
  }
}
