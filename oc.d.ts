import { Request, Response } from 'express';

type Callback<T> = (err: Error | null, data: T) => void;

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
