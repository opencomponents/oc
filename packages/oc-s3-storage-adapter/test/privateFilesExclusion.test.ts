/* eslint-disable @typescript-eslint/no-non-null-assertion */
import s3 from '../src';

test('put directory uses the supplied privacy classifier', async () => {
  const options = {
    bucket: 'test',
    region: 'region-test',
    key: 'test-key',
    secret: 'test-secret',
    path: '/',
    componentsDir: 'components'
  };

  const client = s3(options);

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
