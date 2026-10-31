const fs = require('node:fs');
const stream = require('node:stream');
const utils = require('oc-storage-adapters-utils');
const requireWithMocks = require('../../../test-helpers/require-with-mocks');

let cachedTxt = 0;
let cachedJson = 0;

const blobServiceClient = {
  getContainerClient(containerName) {
    return {
      getBlobClient(filePath) {
        return {
          async download() {
            cachedTxt++;
            cachedJson++;
            const notExistsError = {
              name: 'StorageError',
              code: 'BlobNotFound',
              statusCode: 404
            };
            const contents = {
              'path/test.txt': { content: 'Hello!' },
              'path/test.json': { content: JSON.stringify({ data: 'Hello!' }) },
              'path/not-found.txt': { error: notExistsError },
              'path/not-found.json': { error: notExistsError },
              'path/not-a-json.json': { content: 'Not a json' },
              'path/to-mutable.json': {
                content: JSON.stringify({ value: cachedJson })
              },
              'path/to-mutable.txt': { content: String(cachedTxt) }
            };

            const testResult = contents[filePath];

            if (testResult.error) throw testResult.error;

            return {
              readableStreamBody: stream.Readable.from([testResult.content])
            };
          }
        };
      },
      getBlockBlobClient(fileName) {
        return {
          async uploadData(content, settings) {
            if (fileName.indexOf('error') >= 0) {
              throw { msg: 'sorry' };
            }

            return {
              fileName,
              lengthWritten: content.length,
              container: containerName,
              settings
            };
          }
        };
      },
      listBlobsByHierarchy(_delimiter, { prefix }) {
        return {
          async *[Symbol.asyncIterator]() {
            const entries = {
              'components/': [
                { name: 'components/image', kind: 'prefix' },
                {
                  name: 'components/components/details.json',
                  kind: 'blob'
                }
              ],
              'components/image/': [
                { name: 'components/image/1.0.0', kind: 'prefix' },
                { name: 'components/image/1.0.1', kind: 'prefix' }
              ],
              'components/image/1.0.0': [
                { name: 'components/image/1.0.1/image.png', kind: 'blob' }
              ]
            };

            for (const entry of entries[prefix] || []) {
              yield entry;
            }
          }
        };
      }
    };
  }
};

function StorageSharedKeyCredential(account, key) {
  return { account, key };
}

function BlobServiceClient(url, credentials) {
  return { _credentials: credentials, _url: url, ...blobServiceClient };
}

class DefaultAzureCredential {
  async getToken() {
    return { token: 'token', expiresOnTimestamp: Date.now() + 3600000 };
  }
}

const azure = requireWithMocks(require.resolve('../dist'), {
  '@azure/identity': { DefaultAzureCredential },
  '@azure/storage-blob': { BlobServiceClient, StorageSharedKeyCredential },
  'node:fs': { ...fs, createReadStream: () => 'this is a stream' },
  'oc-storage-adapters-utils': {
    ...utils,
    listFiles: async (pathToDir) => [
      `${pathToDir}\\package.json`,
      `${pathToDir}\\server.js`,
      `${pathToDir}\\.env`,
      `${pathToDir}\\template.js`,
      `${pathToDir}/package.json`,
      `${pathToDir}/server.js`,
      `${pathToDir}/.env`,
      `${pathToDir}/template.js`
    ]
  }
});

const rejection = (promise) =>
  promise.then(
    () => {
      throw new Error('Expected promise to reject');
    },
    (err) => err
  );

module.exports = { azure, rejection };
