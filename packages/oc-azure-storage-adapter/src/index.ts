import path from 'node:path';
import { promisify } from 'node:util';
import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import {
  type AnonymousCredential,
  BlobServiceClient,
  type BlockBlobUploadOptions,
  type ContainerClient,
  StorageSharedKeyCredential
} from '@azure/storage-blob';
import fs from 'fs-extra';
import Cache from 'nice-cache';
import nodeDir, { type PathsResult } from 'node-dir';
import {
  getFileInfo,
  type StorageAdapter,
  type StorageAdapterBaseConfig,
  strings
} from 'oc-storage-adapters-utils';

const getPaths: (path: string) => Promise<PathsResult> = promisify(
  nodeDir.paths
);

// [Node.js only] A helper method used to read a Node.js readable stream into a Buffer
async function streamToBuffer(readableStream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

export interface AzureConfig extends StorageAdapterBaseConfig {
  /**
   * Name of the **public** Azure Blob container that will host the static,
   * publicly accessible files of a component (css, js, templates, etc.).
   */
  publicContainerName: string;

  /**
   * Name of the **private** Azure Blob container that will host files that must
   * not be publicly accessible (e.g. `server.js`, dot-files, etc.).
   */
  privateContainerName: string;

  /**
   * Azure Storage account name that owns the containers.
   */
  accountName: string;

  /**
   * Access key for the storage account. If **omitted**, the adapter falls back
   * to Azure's default credential chain (`DefaultAzureCredential`). Optional.
   */
  accountKey?: string;

  credential?:
    | StorageSharedKeyCredential
    | AnonymousCredential
    | TokenCredential;
}

export default function azureAdapter(conf: AzureConfig): StorageAdapter {
  const isValid = () => {
    if (
      !conf.publicContainerName ||
      !conf.privateContainerName ||
      !conf.accountName
    ) {
      return false;
    }
    return true;
  };

  const cache = new Cache({
    verbose: !!conf.verbosity,
    refreshInterval: conf.refreshInterval
  });

  let privateClient: ContainerClient | undefined;
  let publicClient: ContainerClient | undefined;

  const getClient = () => {
    if (!privateClient || !publicClient) {
      const client = new BlobServiceClient(
        `https://${conf.accountName}.blob.core.windows.net`,
        conf.accountName && conf.accountKey
          ? new StorageSharedKeyCredential(conf.accountName, conf.accountKey)
          : conf.credential
            ? conf.credential
            : new DefaultAzureCredential()
      );
      publicClient = client.getContainerClient(conf.publicContainerName);
      privateClient = client.getContainerClient(conf.privateContainerName);

      return { publicClient, privateClient };
    }
    return { publicClient, privateClient };
  };

  const getFile = async (filePath: string, force = false) => {
    const getFromAzure = async () => {
      const { privateClient } = getClient();
      const blobClient = privateClient.getBlobClient(filePath);
      try {
        const downloadBlockBlobResponse = await blobClient.download();
        const fileContent = (
          await streamToBuffer(downloadBlockBlobResponse.readableStreamBody!)
        ).toString();

        return fileContent;
      } catch (err) {
        if ((err as any).statusCode === 404) {
          throw {
            code: strings.errors.STORAGE.FILE_NOT_FOUND_CODE,
            msg: strings.errors.STORAGE.FILE_NOT_FOUND(filePath)
          };
        }
        throw err;
      }
    };

    if (force) {
      return getFromAzure();
    }

    const cached = cache.get('azure-file', filePath);

    if (cached) {
      return cached;
    }

    const result = await getFromAzure();
    cache.set('azure-file', filePath, result);
    cache.sub('azure-file', filePath, getFromAzure);

    return result;
  };

  const getJson = async (filePath: string, force = false) => {
    const file = await getFile(filePath, force);

    try {
      return JSON.parse(file);
    } catch (_er) {
      throw {
        code: strings.errors.STORAGE.FILE_NOT_VALID_CODE,
        msg: strings.errors.STORAGE.FILE_NOT_VALID(filePath)
      };
    }
  };

  const getUrl = (componentName: string, version: string, fileName: string) =>
    `${conf.path}${componentName}/${version}/${fileName}`;

  const listSubDirectories = async (dir: string) => {
    const normalisedPath =
      dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
        ? dir
        : `${dir}/`;

    const { privateClient } = getClient();
    const subDirectories = [];

    for await (const item of privateClient.listBlobsByHierarchy('/', {
      prefix: normalisedPath
    })) {
      if (item.kind === 'prefix') {
        const subDirectory = item.name
          .replace(normalisedPath, '')
          .replace(/\/$/, '');

        subDirectories.push(subDirectory);
      }
    }

    return subDirectories;
  };

  const putDir = async (dirInput: string, dirOutput: string) => {
    const paths = await getPaths(dirInput);
    const packageJsonFile = path.join(dirInput, 'package.json');
    const files = paths.files.filter((file) => file !== packageJsonFile);

    const filesResults = await Promise.all(
      files.map((file: string) => {
        const relativeFile = file.slice(dirInput.length);
        const url = (dirOutput + relativeFile).replace(/\\/g, '/');

        const serverPattern = /(\\|\/)server\.js/;
        const dotFilePattern = /(\\|\/)\..+/;
        const privateFilePatterns = [serverPattern, dotFilePattern];
        return putFile(
          file,
          url,
          privateFilePatterns.some((r) => r.test(relativeFile))
        );
      })
    );
    // Ensuring package.json is uploaded last so we can verify that a component
    // was properly uploaded by checking if package.json exists
    const packageJsonFileResult = await putFile(
      packageJsonFile,
      `${dirOutput}/package.json`.replace(/\\/g, '/'),
      false
    );

    return [...filesResults, packageJsonFileResult];
  };

  const putFileContent = async (
    fileContent: string | fs.ReadStream,
    fileName: string,
    isPrivate: boolean
  ) => {
    const content =
      typeof fileContent === 'string'
        ? Buffer.from(fileContent)
        : await streamToBuffer(fileContent);

    const uploadToAzureContainer = (client: ContainerClient) => {
      const fileInfo = getFileInfo(fileName);
      const blobHTTPHeaders: BlockBlobUploadOptions['blobHTTPHeaders'] = {
        blobCacheControl: 'public, max-age=31556926'
      };

      if (fileInfo.mimeType) {
        blobHTTPHeaders.blobContentType = fileInfo.mimeType;
      }

      if (fileInfo.gzip) {
        blobHTTPHeaders.blobContentEncoding = 'gzip';
      }
      const blockBlobClient = client.getBlockBlobClient(fileName);

      return blockBlobClient.uploadData(content, {
        blobHTTPHeaders
      });
    };

    const { publicClient, privateClient } = getClient();
    let result = await uploadToAzureContainer(privateClient);
    if (!isPrivate) {
      result = await uploadToAzureContainer(publicClient);
    }
    return result;
  };

  const putFile = (filePath: string, fileName: string, isPrivate: boolean) => {
    const stream = fs.createReadStream(filePath);
    return putFileContent(stream, fileName, isPrivate);
  };

  const removeDir = async (dir: string) => {
    const removeFromContainer = async (isPrivate: boolean) => {
      const { publicClient, privateClient } = getClient();
      const client = isPrivate ? privateClient : publicClient;
      const files: string[] = [];
      const normalisedPath =
        dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
          ? dir
          : `${dir}/`;

      for await (const blob of client.listBlobsFlat({
        prefix: normalisedPath
      })) {
        files.push(blob.name);
      }

      return Promise.all(files.map((file) => removeFile(file, isPrivate)));
    };

    return Promise.all([removeFromContainer(true), removeFromContainer(false)]);
  };

  const removeFile = async (filePath: string, isPrivate: boolean) => {
    const { publicClient, privateClient } = getClient();
    if (!isPrivate) {
      const blockBlobClient = publicClient.getBlockBlobClient(filePath);
      await blockBlobClient.delete();
    }

    const blockBlobClient = privateClient.getBlockBlobClient(filePath);
    return blockBlobClient.delete();
  };

  return {
    getFile,
    getJson,
    getUrl,
    listSubDirectories,
    maxConcurrentRequests: 20,
    putDir,
    putFile,
    putFileContent,
    removeFile,
    removeDir,
    adapterType: 'azure-blob-storage',
    isValid
  };
}

module.exports = azureAdapter;
