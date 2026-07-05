jest.mock('fs-extra', () => {
  return {
    createReadStream: jest.fn(() => 'this is a stream'),
    readFile: jest.fn((cb) => cb(null, 'file content!')),
    writeFileSync: jest.fn()
  };
});

let mockCachedTxt = 0;
let mockCachedJson = 0;
const googleStorage = {};

const _Storage = class {
  constructor() {
    this.bucket = jest.fn((bucket) => ({
      getFiles: (options = {}) => {
        if (bucket === 'my-empty-bucket') {
          return Promise.resolve([]);
        }

        if (bucket === 'paginated-bucket') {
          const makeFile = (name) => ({
            name,
            delete: jest.fn(() => Promise.resolve())
          });

          if (!options.pageToken) {
            return Promise.resolve([
              [
                makeFile('components/a/1.0.0/app.js'),
                makeFile('components/a/1.0.0/server.js')
              ],
              { pageToken: 'page-2' }
            ]);
          }

          return Promise.resolve([
            [makeFile('components/a/2.0.0/app.js')],
            null
          ]);
        }

        const files = [
          [
            {
              name: 'components/image/1.0.0/app.js',
              delete: jest.fn(() => Promise.resolve())
            },
            {
              name: 'components/image/1.0.0/server.js',
              delete: jest.fn(() => Promise.resolve())
            },
            {
              name: 'components/image/1.0.0/.env',
              delete: jest.fn(() => Promise.resolve())
            },
            {
              name: 'components/image/1.0.1/new-server.js',
              delete: jest.fn(() => Promise.resolve())
            },
            {
              name: 'components/image/1.0.1/new-.env',
              delete: jest.fn(() => Promise.resolve())
            },
            {
              name: 'components/image/1.0.1/new-app.js',
              delete: jest.fn(() => Promise.resolve())
            }
          ]
        ];
        return Promise.resolve(files);
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
          } else {
            return Promise.resolve(content);
          }
        }
      })
    }));
  }
};

googleStorage.Storage = _Storage;
module.exports = googleStorage;
