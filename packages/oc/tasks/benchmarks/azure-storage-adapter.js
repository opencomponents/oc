// OC storage adapter that talks to a local Azurite blob service instead of
// real Azure Blob Storage. Mirrors the interface of oc-azure-storage-adapter.
const path = require('node:path');
const {
  BlobServiceClient,
  StorageSharedKeyCredential
} = require('@azure/storage-blob');
const { strings } = require('oc-storage-adapters-utils');

const FILE_NOT_FOUND_CODE = strings.errors.STORAGE.FILE_NOT_FOUND_CODE;

const streamToBuffer = async (readableStream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
};

const createStorageAdapter = (options) => {
  const {
    endpoint,
    accountName,
    accountKey,
    publicContainerName,
    privateContainerName,
    maxConcurrentRequests = 20
  } = options;

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const serviceClient = new BlobServiceClient(endpoint, credential);
  const publicClient = serviceClient.getContainerClient(publicContainerName);
  const privateClient = serviceClient.getContainerClient(privateContainerName);

  const normalisePath = (filePath) =>
    filePath.startsWith('/') ? filePath.slice(1) : filePath;

  const getFile = async (filePath) => {
    const blobClient = privateClient.getBlobClient(normalisePath(filePath));
    try {
      const response = await blobClient.download();
      const buffer = await streamToBuffer(response.readableStreamBody);
      return buffer.toString();
    } catch (err) {
      if (err.statusCode === 404) {
        const notFoundError = new Error(
          strings.errors.STORAGE.FILE_NOT_FOUND(filePath)
        );
        notFoundError.code = FILE_NOT_FOUND_CODE;
        throw notFoundError;
      }
      throw err;
    }
  };

  const getJson = async (filePath) => {
    const content = await getFile(filePath);
    try {
      return JSON.parse(content);
    } catch {
      throw {
        code: strings.errors.STORAGE.FILE_NOT_VALID_CODE,
        msg: strings.errors.STORAGE.FILE_NOT_VALID(filePath)
      };
    }
  };

  const listSubDirectories = async (directoryPath) => {
    const normalisedPath = directoryPath.endsWith('/')
      ? normalisePath(directoryPath)
      : `${normalisePath(directoryPath)}/`;

    const subDirectories = [];
    for await (const item of privateClient.listBlobsByHierarchy('/', {
      prefix: normalisedPath
    })) {
      if (item.kind === 'prefix') {
        const subDirectory = item.name
          .replace(normalisedPath, '')
          .replace(/\/$/, '');
        if (subDirectory) {
          subDirectories.push(subDirectory);
        }
      }
    }
    return subDirectories.sort();
  };

  const putFileContent = async (fileContent, fileName, isPrivate) => {
    const content = Buffer.isBuffer(fileContent)
      ? fileContent
      : typeof fileContent === 'string'
        ? Buffer.from(fileContent)
        : await streamToBuffer(fileContent);
    const normalisedName = normalisePath(fileName);

    const uploadToContainer = async (client) => {
      const blockBlobClient = client.getBlockBlobClient(normalisedName);
      await blockBlobClient.uploadData(content, {
        blobHTTPHeaders: {
          blobCacheControl: 'public, max-age=31556926'
        }
      });
    };

    await uploadToContainer(privateClient);
    if (!isPrivate) {
      await uploadToContainer(publicClient);
    }
  };

  const putDir = async () => {
    // Benchmark harness does not publish components via this adapter.
  };

  const putFile = async () => {
    // Benchmark harness does not publish components via this adapter.
  };

  const getUrl = (componentName, version, fileName) =>
    `${path.join(
      endpoint,
      publicContainerName,
      options.componentsDir || 'components',
      componentName,
      version,
      fileName
    )}`;

  return {
    adapterType: 'azure-blob-storage',
    maxConcurrentRequests,
    getFile,
    getJson,
    getUrl,
    listSubDirectories,
    putDir,
    putFile,
    putFileContent,
    getClient: () => ({ publicClient, privateClient })
  };
};

module.exports = createStorageAdapter;
