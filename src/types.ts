import type { NextFunction, Request, Response } from 'express';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import type { PackageJson } from 'type-fest';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

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

export type ComponentDetail = {
  [componentVersion: string]: {
    publishDate: number;
    templateSize?: number;
  };
};

export interface ComponentsDetails {
  components: {
    [componentName: string]: ComponentDetail;
  };
  lastEdit: number;
}

export interface ComponentsList {
  components: Record<string, string[]>;
  lastEdit: number;
}

export interface OcParameter {
  default?: string | boolean | number;
  description?: string;
  example?: string | boolean | number;
  mandatory?: boolean;
  /**
   * You can optionally restrict the values of the parameter to a specific set of values.
   * @example
   * ```ts
   * {
   *   type: 'string',
   *   enum: ['foo', 'bar', 'baz']
   * }
   */
  enum?: string[] | number[] | boolean[];
  type: 'string' | 'boolean' | 'number';
}

interface OcConfiguration {
  container?: boolean;
  date: number;
  files: {
    imports?: Record<string, string>;
    dataProvider: {
      hashKey: string;
      src: string;
      type: string;
      size?: number;
    };
    static: string[];
    template: {
      hashKey: string;
      src: string;
      type: string;
      version: string;
      minOcVersion?: string;
      size?: number;
    };
    env?: string;
  };
  packaged: boolean;
  parameters: Record<string, OcParameter>;
  plugins?: string[];
  renderInfo?: boolean;
  state?: 'deprecated' | 'experimental';
  stringifiedDate: string;
  publisher?: string;
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
  availablePlugins: Plugins;
  components: ParsedComponent[];
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
  theme: 'light' | 'dark';
  type: 'oc-registry' | 'oc-registry-local';
  robots: boolean;
}

export type Authentication<T = any> = {
  validate: (config: T) => {
    isValid: boolean;
    message: string;
  };
  middleware: (config: T) => Middleware;
};

export type PublishAuthConfig =
  | {
      type: 'basic';
      username: string;
      password: string;
    }
  | {
      type: 'basic';
      logins: Array<{ username: string; password: string }>;
    }
  | ({ type: string | Authentication } & Record<string, any>);

export interface Config<T = any> {
  /**
   * Public base URL where the registry is reachable by consumers.
   *
   * The value **must** include the configured {@link prefix} at the end
   * (e.g. `https://components.mycompany.com/` if `prefix` is `/`).
   *
   * When it doesn't, the sanitiser will automatically append it.
   *
   * @example "https://components.mycompany.com/"
   */
  baseUrl: string;
  /**
   * Pre-compiled version of the `oc-client` library generated automatically
   * at runtime when `compileClient` is enabled (default).
   *
   * This is filled in by the framework – you normally don't set it yourself.
   * Declared here to keep the type complete.
   *
   * @internal
   */
  compiledClient?: {
    imports?: Record<string, string>;
    code: { gzip: Buffer; brotli: Buffer; minified: string };
    map: string;
    dev: string;
  };
  /**
   * Dynamically compute the `baseUrl` for the incoming request.
   * If provided, it overrides the static `baseUrl`.
   */
  baseUrlFunc?: (opts: { host?: string; secure: boolean }) => string;
  /**
   * Express-compatible hook executed before a component is published.
   * Defaults to a no-op or the authentication middleware specified in
   * {@link publishAuth}.
   */
  beforePublish: (req: Request, res: Response, next: NextFunction) => void;
  /**
   * List of header names (lower-case) to omit from the response when a
   * fallback/weak component version is served.
   *
   * @default []
   */
  customHeadersToSkipOnWeakVersion: string[];
  /**
   * Names of npm packages that components can `require` at runtime.
   *
   * @default []
   * @example ["lodash", "moment"]
   */
  dependencies: string[];
  /**
   * Configuration object to enable/disable the HTML discovery page and the API
   */
  discovery: {
    /**
     * Appends a <meta name="robots" content="index, follow" /> to the HTML head
     * False to append a <meta name="robots" content="noindex, nofollow" />
     * @default true
     */
    robots: boolean;
    /**
     * Enables API discovery endpoints
     * @default true
     */
    api: boolean;
    /**
     * Enables the HTML discovery page
     * @default true
     */
    ui: boolean;
    /**
     * Enables validation for the discovery API
     * @default false
     */
    validate: boolean;
    /**
     * Shows experimental components from the API
     * @default true
     */
    experimental: boolean;
  };
  /**
   * Function invoked to decide whether discovery should be enabled for the
   * current request.
   */
  discoveryFunc?: (opts: { host?: string; secure: boolean }) => boolean;
  /**
   * Environment variables passed to components in `context.env`.
   *
   * @default {}
   */
  env: Record<string, string>;
  /**
   * Maximum execution time of a component’s server-side logic, expressed in
   * seconds. When the timeout elapses the registry returns a 500 error.
   *
   * If omitted there is no execution timeout.
   */
  executionTimeout?: number;
  /**
   * JavaScript code to be included in the preview HTML's <head> section.
   * Can be either a filepath to a JS script or inline JavaScript code.
   *
   * @example "path/to/script.js"
   * @example "console.log('Hello from preload script');"
   */
  preload?: string;
  /**
   * URL of a secondary registry that will be queried if a component cannot
   * be found on this instance. A trailing slash is appended automatically.
   */
  fallbackRegistryUrl: string;
  /**
   * Enables the fallback client to be used
   *
   * @default false
   */
  fallbackClient: boolean;
  /**
   * Enables hot-reloading of component code (always `true` when `local` is).
   *
   * @default !!local
   */
  hotReloading: boolean;
  /**
   * Milliseconds the HTTP server keeps idle connections alive.
   *
   * @default 5000
   */
  keepAliveTimeout?: number;
  /**
   * TCP port of the LiveReload server used by the preview page.
   */
  liveReloadPort: number;
  /**
   * Restricts the registry to serve only the specified component names.
   */
  components?: string[];
  /**
   * Indicates whether the registry serves components from the local file
   * system (`true`) or from the remote storage (`false`).
   */
  local: boolean;
  /**
   * File and directory mode (octal) applied when extracting tarballs during
   * publishing.
   *
   * @default 0o766
   */
  tarExtractMode: number;
  /**
   * Absolute path where local components are stored.
   */
  path: string;
  /**
   * Collection of plugins initialised for this registry instance.
   * Populated via `registry.register(...)`.
   */
  plugins: Plugins;
  /**
   * Seconds between each poll of the storage adapter for changes.
   *
   * @default 5
   */
  pollingInterval: number;
  /**
   * Port the HTTP server listens on.
   *
   * @default process.env.PORT ?? 3000
   */
  port: number | string;
  /**
   * Maximum allowed `Content-Length` for *publish* requests.
   * Accepts any value supported by the `bytes` module (e.g. "10mb").
   */
  postRequestPayloadSize?: string | number;
  /**
   * URL path prefix appended to every registry endpoint.
   * It **must** start and end with a slash (e.g. `/`, `/components/`).
   *
   * @default "/"
   */
  prefix: string;
  /**
   * Authentication strategy for component publishing.
   */
  publishAuth?: PublishAuthConfig;
  /**
   * Custom validation logic executed during component publishing.
   */
  publishValidation: (
    pkgJson: unknown,
    context: { user?: string }
  ) =>
    | {
        isValid: boolean;
        error?: string;
      }
    | boolean;
  /**
   * Seconds between each refresh of the internal component list cache.
   */
  refreshInterval?: number;
  /**
   * Additional Express routes to mount on the registry application.
   */
  routes?: Array<{
    route: string;
    method: string;
    handler: string | ((req: Request, res: Response) => void);
  }>;
  /**
   * Convenience S3 configuration – if present the registry will create
   * a storage adapter automatically.
   */
  s3?: {
    bucket: string;
    region: string;
    key?: string;
    secret?: string;
    componentsDir: string;
  };
  /**
   * Low-level storage adapter used by the registry.
   */
  storage: {
    adapter: (options: T) => StorageAdapter;
    options: T & { componentsDir: string };
  };
  /**
   * Directory used by the registry for temporary files.
   */
  tempDir: string;
  /**
   * List of template engines available for rendering components.
   */
  templates: Template[];
  /**
   * HTTP request timeout in **milliseconds**.
   *
   * @default 120000
   */
  timeout: number;
  /**
   * Verbosity level of the console logger (0 = silent).
   *
   * @default 0
   */
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
  render: (options: any, cb: (err: Error | null, data: string) => void) => void;
}

interface BasePLugin<T = any> {
  description?: string;
  name: string;
  options?: T;
  register: {
    register: (
      options: T,
      dependencies: any,
      next: (error?: Error) => void
    ) => void;
    dependencies?: string[];
  };
}

/**
 * The context object passed to the plugin's execute function
 */
export type PluginContext = {
  /**
   * The name of the component calling the plugin
   */
  name: string;
  /**
   * The version of the component calling the plugin
   */
  version: string;
};

export type Plugin<T = any> = BasePLugin<T> &
  (
    | {
        /**
         * When false or undefined, the plugin's execute function will be called directly.
         * The execute function should accept any parameters and return any value.
         */
        context?: false | undefined;
        register: {
          register: (
            options: T,
            dependencies: any,
            next: (error?: Error) => void
          ) => void;
          execute: (...args: any[]) => any;
          dependencies?: string[];
        };
      }
    | {
        /**
         * When true, the plugin's execute function will be called with a context object containing
         * the component name and version. It should return a function that accepts parameters and returns any value.
         * @example
         * ```ts
         * {
         *   register: {
         *     execute: (...args: any[]) => any
         *   }
         * }
         * ```
         */
        context: true;
        register: {
          register: (
            options: T,
            dependencies: any,
            next: (error?: Error) => void
          ) => void;
          execute: (context: PluginContext) => (params: any) => any;
          dependencies?: string[];
        };
      }
  );

export interface Plugins {
  [pluginName: string]: {
    handler: (...args: unknown[]) => void;
    description: string;
    context: boolean;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: string;
    }
    interface Response {
      conf: Config;
      errorCode?: string;
      errorDetails?: string;
    }
  }
}
