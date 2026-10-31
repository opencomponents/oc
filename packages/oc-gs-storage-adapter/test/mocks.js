const fs = require('node:fs');
const utils = require('oc-storage-adapters-utils');
const requireWithMocks = require('../../../test-helpers/require-with-mocks');

let mockCachedTxt = 0;
let mockCachedJson = 0;

const deletableFile = (name) => ({ name, delete: () => Promise.resolve() });

class Storage {
  bucket(bucket) {
    return {
      getFiles: (options = {}) => {
        if (bucket === 'my-empty-bucket') {
          return Promise.resolve([]);
        }

        if (bucket === 'failing-bucket') {
          return Promise.reject({ code: 503, message: 'Service unavailable' });
        }

        if (bucket === 'missing-bucket') {
          return Promise.reject({ code: 404, message: 'Bucket not found' });
        }

        if (bucket === 'unchanged-page-token-bucket') {
          return Promise.resolve([
            [{ name: 'components/a/1.0.0/app.js' }],
            { pageToken: 'unchanged-token' }
          ]);
        }

        if (bucket === 'paginated-bucket') {
          if (!options.pageToken) {
            return Promise.resolve([
              [
                deletableFile('components/a/1.0.0/app.js'),
                deletableFile('components/a/1.0.0/server.js')
              ],
              { pageToken: 'page-2' }
            ]);
          }

          return Promise.resolve([
            [deletableFile('components/a/2.0.0/app.js')],
            null
          ]);
        }

        return Promise.resolve([
          [
            deletableFile('components/image/1.0.0/app.js'),
            deletableFile('components/image/1.0.0/server.js'),
            deletableFile('components/image/1.0.0/.env'),
            deletableFile('components/image/1.0.1/new-server.js'),
            deletableFile('components/image/1.0.1/new-.env'),
            deletableFile('components/image/1.0.1/new-app.js')
          ]
        ]);
      },
      upload: (_filePath, { destination }) => {
        if (destination.match('-error')) {
          return Promise.reject({
            code: 1234,
            message: 'an error message'
          });
        }
        return Promise.resolve();
      },
      file: (file) => ({
        makePublic() {
          return Promise.resolve();
        },
        download() {
          mockCachedTxt++;
          mockCachedJson++;
          const contents = {
            'path/test.txt': 'Hello!',
            'path/test.json': JSON.stringify({ value: 'Hello!' }),
            'path/not-found.txt': { error: { code: 404 } },
            'path/not-found.json': { error: { code: 404 } },
            'path/not-a-json.json': {
              error: { code: '1', msg: 'not an error' }
            },
            'path/to-mutable.json': JSON.stringify({ value: mockCachedJson }),
            'path/to-mutable.txt': mockCachedTxt
          };
          const content = contents[file];
          if (content.error) {
            return Promise.reject(content.error);
          }
          return Promise.resolve(content);
        }
      })
    };
  }
}

const loadGs = (listFiles) =>
  requireWithMocks(require.resolve('../dist'), {
    '@google-cloud/storage': { Storage },
    'node:fs': {
      ...fs,
      createReadStream: () => 'this is a stream',
      writeFileSync: () => {}
    },
    'oc-storage-adapters-utils': { ...utils, listFiles }
  });

const rejection = (promise) =>
  promise.then(
    () => {
      throw new Error('Expected promise to reject');
    },
    (err) => err
  );

module.exports = { loadGs, rejection };
