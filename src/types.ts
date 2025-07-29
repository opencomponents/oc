import type { NextFunction, Request, Response } from 'express';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import type { PackageJson } from 'type-fest';

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
   * Enables the HTML discovery page and `/components` endpoint.
   *
   * @default true
   */
  discovery: boolean;
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
   * URL of a secondary registry that will be queried if a component cannot
   * be found on this instance. A trailing slash is appended automatically.
   */
  fallbackRegistryUrl: string;
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
  plugins: Record<string, (...args: unknown[]) => void>;
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
    handler: (req: Request, res: Response) => void;
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
  /**
   * Rate limiting configuration for component publishing.
   */
  publishRateLimit?: PublishRateLimit;
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

export interface Plugin<T = any> {
  callback?: (error?: unknown) => void;
  description?: string;
  name: string;
  options?: T;
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

export interface RateLimitStore {
  /** Called once on registry start-up (optional) */
  init?: () => Promise<void> | void;

  /**
   * Atomically increase the counter for the key.
   * Returns the current hit count and the absolute reset time.
   */
  increment: (
    key: string,
    windowMs: number
  ) => Promise<{
    totalHits: number;
    resetTime: Date;
  }>;
}

export interface PublishRateLimit {
  /**
   * Size of the sliding window in **ms** (default 15 min)
   *
   * @default 15 * 60 * 1000
   */
  windowMs?: number;
  /**
   * Maximum hits allowed within `windowMs` (default 100)
   *
   * @default 100
   */
  max?: number;
  /**
   * Custom key generator.
   *
   * Defaults to: `${req.ip}:${req.user ?? 'anon'}`
   */
  keyGenerator?: (req: Request) => string;
  /**
   * Skip throttling for specific requests/users
   */
  skip?: (req: Request) => boolean;
  /**
   * Custom storage backend. Defaults to in-memory Map.
   */
  store?: RateLimitStore;
  /**
   * Maximum number of rate limit entries to keep in memory (default 1000)
   *
   * @default 1000
   */
  maxCacheSize?: number;
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
