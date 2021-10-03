import { NextFunction, Request, Response } from 'express';

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
}

export interface Component {
  allVersions: string[];
  author: Author;
  repository?: string;
  dependencies: Record<string, string>;
  description: string;
  devDependencies: Record<string, string>;
  name: string;
  oc: OcConfiguration;
  scripts: Record<string, string>;
  version: string;
}

export interface VM {
  availablePlugins: Record<string, Function>;
  availableDependencies: Array<{
    core: boolean;
    name: string;
    version: string;
    link: string;
  }>;
  components: Component[];
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
  plugins: Record<string, Function>;
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
  publishValidation: (
    data: unknown
  ) =>
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
}

export interface Cdn {
  getJson: <T>(filePath: string, force: boolean, cb: Callback<T>) => void;
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
}

export interface Template {
  getInfo: () => TemplateInfo;
  getCompiledTemplate: Function;
  render: Function;
  compile?: Function;
}

export interface Plugin {
  name: string;
  register: {
    register: Function;
    execute: Function;
    dependencies: string[];
  };
  description?: string;
  options?: any;
  callback: Function;
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
  namespace Express {
    interface Response {
      conf: Config;
      errorDetails?: string;
      errorCode?: string;
    }
  }
}
