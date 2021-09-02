import { Express, Request, Response } from 'express';
import { Server } from 'http';

type Callback<T = unknown> = (err: Error | null, data: T) => void;

interface Template {}

interface PackageJson {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  license?: string;
  author?: string | { name?: string; email?: string; url?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface Validation {
  isValid: boolean;
  error: string;
}

interface Route {
  route: string;
  method: string;
  handler: (req: Request, res: Response) => void;
}

interface BasicAuth {
  type: string;
  username: string;
  password: string;
}

type S3BaseOptions = {
  agentProxy?: any;
  bucket: string;
  componentsDir: string;
  path: string;
  region: string;
  timeout?: number;
};

type S3Options =
  | S3BaseOptions
  | (S3BaseOptions & { key: string; secret: string });

interface AzureBlobStorageOptions {
  accountName: string;
  accountKey: string;
  publicContainerName: string;
  privateContainerName: string;
  path: string;
  componentsDir: string;
}

interface StorageAdapter {
  getFile: (filePath: string, force: boolean, cb: Callback<string>) => void;
  getJson: (filePath: string, force: boolean, cb: Callback<unknown>) => void;
  getUrl: (componentName: string, version: string, fileName: string) => string;
  listSubDirectories: (dir: string, cb: Callback<string[]>) => void;
  maxConcurrentRequests: number;
  putDir: (dirIput: string, dirOutput: string, cb: Callback<unknown>) => void;
  putFile: (
    filePath: string,
    fileName: string,
    isPrivate: boolean,
    cb: Callback<unknown>
  ) => void;
  putFileContent: (
    fileContent: string,
    fileName: string,
    isPrivate: boolean,
    cb: Callback<unknown>
  ) => void;
  adapterType: string;
  isValid: () => boolean;
  getConfig: () => () => unknown;
}

type Storage = {
  adapter: StorageAdapter;
  options: S3Options | AzureBlobStorageOptions;
};

interface RegistryConfiguration {
  baseUrl: string;
  customHeadersToSkipOnWeakVersion?: string[];
  dependencies?: string[];
  discovery?: boolean;
  env?: Record<string, string>;
  executionTimeout: number;
  fallbackRegistryUrl?: string;
  keepAliveTimeout?: number;
  pollingInterval?: number;
  port?: number;
  postRequestPayloadSize?: string;
  prefix?: string;
  publishAuth?: BasicAuth;
  publishValidation?: (package: PackageJson) => Validation | boolean;
  refreshInterval?: number;
  routes?: Route[];
  s3?: S3Options;
  storage?: any;
  tempDir?: string;
  templates?: Template[];
  timeout?: number;
  verbosity?: number;
}

interface Plugin<T = unknown> {
  name: string;
  register: {
    register: (options: T, dependencies: any, next: any) => void;
    execute: (...args: any[]) => any;
    dependencies?: string[];
  };
  options?: T;
}

interface RequestData
  extends Pick<
      Request,
      'body' | 'headers' | 'method' | 'path' | 'originalUrl' | 'query'
    >,
    Pick<Response, 'statusCode'> {
  duration: number;
  url: string;
}

interface ComponentData extends Pick<Request, 'headers'> {
  name: string;
  parameters: Record<string, string>;
  version: string;
  status: number;
  duration: number;
  href: string;
  renderMode: 'rendered' | 'unrendered';
  error?: string;
  code?: string;
}

interface EventListener {
  (eventName: 'start', listener: () => void): void;
  (
    eventName: 'error',
    listener: (data: { code: string; message: string }) => void
  ): void;
  (eventName: 'cache-poll', listener: (timestamp: number) => void): void;
  (eventName: 'request', listener: (data: RequestData) => void): void;
  (
    eventName: 'component-retrieved',
    listener: (data: ComponentData) => void
  ): void;
}

export function Registry(
  options: RegistryConfiguration
): {
  close: (cb: Callback) => void;
  on: EventListener;
  register: (plugin: Plugin, cb?: Callback<unknown>) => void;
  start: (cb?: Callback<{ app: Express; server: Server }>) => void;
  app: Express;
};
