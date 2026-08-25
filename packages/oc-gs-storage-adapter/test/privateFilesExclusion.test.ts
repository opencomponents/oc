/* eslint-disable @typescript-eslint/no-non-null-assertion */
import gs from '../src';

jest.mock('node-dir', () => {
  return {
    paths: jest.fn((pathToDir, cb) => {
      cb(null, {
        files: [
          `${pathToDir}\\package.json`,
          `${pathToDir}\\server.js`,
          `${pathToDir}\\.env`,
          `${pathToDir}\\template.js`,
          `${pathToDir}/package.json`,
          `${pathToDir}/server.js`,
          `${pathToDir}/.env`,
          `${pathToDir}/template.js`
        ]
      });
    })
  };
});

test('put directory uses the supplied privacy classifier', async () => {
  const options = {
    bucket: 'test',
    projectId: '12345',
    path: 'somepath',
    componentsDir: 'components'
  };
  const client = gs(options);

  const mockResult = (await client.putDir('.', '.', (filePath) =>
    filePath.endsWith('template.js')
  )) as Array<{
    Key: string;
    ACL: string;
  }>;
  const serverMock = mockResult.find((x) => x.Key === `./server.js`)!;
  const envMock = mockResult.find((x) => x.Key === './.env')!;
  const packageMock = mockResult.find((x) => x.Key === './package.json')!;
  const templateMock = mockResult.find((x) => x.Key === './template.js')!;

  expect(serverMock.ACL).toBe('public-read');
  expect(envMock.ACL).toBe('public-read');
  expect(packageMock.ACL).toBe('public-read');
  expect(templateMock.ACL).toBe('authenticated-read');
});
