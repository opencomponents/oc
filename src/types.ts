import { NextFunction, Request, Response } from 'express';
import { PackageJson } from 'type-fest';
import { StorageAdapter } from 'oc-storage-adapters-utils';

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
    devUrl?: string;
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
  components: Record<string, string[]>;
  lastEdit: number;
}

export interface OcJsonConfig {
  registries?: string[];
  mocks?: {
    plugins?: {
      dynamic?: Record<string, string>;
      static?: Record<string, string>;
    };
  };
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

export type Authentication<T = any> = {
  validate: (config: T) => {
    isValid: boolean;
    message: string;
  };
  middleware: (config: T) => any;
};

export type PublishAuthConfig =
  | {
      type: 'basic';
      username: string;
      password: string;
    }
  | ({ type: string | Authentication } & Record<string, any>);

export interface Config {
  baseUrl: string;
  baseUrlFunc?: (opts: { host?: string; secure: boolean }) => string;
  beforePublish: (req: Request, res: Response, next: NextFunction) => void;
  customHeadersToSkipOnWeakVersion: string[];
  dependencies: string[];
  discovery: boolean;
  discoveryFunc?: (opts: { host?: string; secure: boolean }) => boolean;
  env: Record<string, string>;
  executionTimeout?: number;
  fallbackRegistryUrl: string;
  hotReloading: boolean;
  keepAliveTimeout?: number;
  liveReloadPort: number;
  components?: string[];
  local: boolean;
  tarExtractMode: number;
  path: string;
  plugins: Record<string, (...args: unknown[]) => void>;
  pollingInterval: number;
  port: number | string;
  postRequestPayloadSize?: number;
  prefix: string;
  publishAuth?: PublishAuthConfig;
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
    adapter: (options: any) => StorageAdapter;
    options: Record<string, any> & { componentsDir: string };
  };
  tempDir: string;
  templates: any[];
  timeout: number;
  verbosity: number;
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
  compile?: (options: CompilerOptions, cb: (err: Error | null) => void) => void;
  getCompiledTemplate: (
    templateString: string,
    key: string,
    context?: Record<string, unknown>
  ) => CompiledTemplate;
  getInfo: () => TemplateInfo;
  render: (
    options: { model: unknown; template: CompiledTemplate },
    cb: (err: Error | null, data: string) => void
  ) => void;
}

export interface Plugin {
  callback?: (error: unknown) => void;
  description?: string;
  name: string;
  options?: any;
  register: {
    register: (
      options: any,
      dependencies: any,
      next: (error?: Error) => void
    ) => void;
    execute: (...args: any[]) => any;
    dependencies?: string[];
  };
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
