const fs = require('node:fs');
const stream = require('node:stream');
const utils = require('oc-storage-adapters-utils');
const requireWithMocks = require('../../../test-helpers/require-with-mocks');

const ERROR_DATE = new Date('2017');

let cachedTxt = 0;
let cachedJson = 0;

class S3 {
  getObject(val) {
    cachedTxt++;
    cachedJson++;
    const contents = {
      'path/test.txt': { content: 'Hello!' },
      'path/test.json': { content: JSON.stringify({ data: 'Hello!' }) },
      'path/not-found.txt': { error: { code: 'NoSuchKey' } },
      'path/not-found.json': { error: { code: 'NoSuchKey' } },
      'path/not-a-json.json': { content: 'Not a json' },
      'path/to-mutable.json': {
        content: JSON.stringify({ value: cachedJson })
      },
      'path/to-mutable.txt': { content: cachedTxt }
    };

    const testResult = contents[val.Key];
    if (testResult.error) throw testResult.error;

    return {
      Body: stream.Readable.from([Buffer.from(String(testResult.content))])
    };
  }

  listObjects(val) {
    if (val.Bucket === 'my-empty-bucket') {
      return Promise.resolve({ CommonPrefixes: [], Contents: [] });
    }

    if (val.Bucket === 'paginated-bucket') {
      const isDelimited = val.Delimiter === '/';

      if (isDelimited) {
        // listSubDirectories path: S3 returns NextMarker when Delimiter is set.
        if (!val.Marker) {
          return Promise.resolve({
            CommonPrefixes: [
              { Prefix: 'components/a/1.0.0/' },
              { Prefix: 'components/a/1.0.1/' }
            ],
            IsTruncated: true,
            NextMarker: 'marker-2'
          });
        }

        return Promise.resolve({
          CommonPrefixes: [{ Prefix: 'components/a/2.0.0/' }],
          IsTruncated: false
        });
      }

      // removeDir path: no Delimiter, so S3 v1 does NOT return NextMarker;
      // the client must use the last Key in Contents as the next Marker.
      if (!val.Marker) {
        return Promise.resolve({
          Contents: [
            { Key: 'components/a/1.0.0/file.js' },
            { Key: 'components/a/1.0.0/package.json' }
          ],
          IsTruncated: true
        });
      }

      return Promise.resolve({
        Contents: [
          { Key: 'components/a/2.0.0/file.js' },
          { Key: 'components/a/2.0.0/package.json' }
        ],
        IsTruncated: false
      });
    }

    const CommonPrefixes = [
      {
        Prefix: 'components/image/1.0.0/'
      },
      {
        Prefix: 'components/image/1.0.1/'
      }
    ];

    return Promise.resolve({ CommonPrefixes });
  }

  deleteObject() {
    return Promise.resolve({});
  }

  putObject(data) {
    if (data?.Key && data.Key.indexOf('error') >= 0) {
      if (data.Key.indexOf('throw') >= 0) {
        throw new Error('sorry');
      }

      throw {
        code: 1234,
        message: 'an error message',
        retryable: true,
        statusCode: 500,
        time: ERROR_DATE,
        hostname: 'hostname',
        region: 'us-west2'
      };
    }

    return data;
  }
}

const s3 = requireWithMocks(require.resolve('../dist'), {
  '@aws-sdk/client-s3': { S3 },
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

module.exports = { ERROR_DATE, rejection, s3 };
