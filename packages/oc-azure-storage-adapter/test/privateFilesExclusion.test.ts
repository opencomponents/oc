/* eslint-disable @typescript-eslint/no-non-null-assertion */
import adapter from '../src';

test('put directory recognizes server.js and .env to be private', async () => {
  const client = adapter({
    publicContainerName: 'pubcon',
    privateContainerName: 'privcon',
    accountName: 'name',
    accountKey: 'key',
    path: '/',
    componentsDir: 'components'
  });

  const mockResult = (await client.putDir('.', '.')) as Array<{
    fileName: string;
    container: string;
  }>;
  const serverMock = mockResult.find((x) => x.fileName === `./server.js`)!;
  const envMock = mockResult.find((x) => x.fileName === './.env')!;
  const packageMock = mockResult.find((x) => x.fileName === './package.json')!;
  const templateMock = mockResult.find((x) => x.fileName === './template.js')!;

  expect(serverMock.container).toBe('privcon');
  expect(envMock.container).toBe('privcon');
  expect(packageMock.container).toBe('pubcon');
  expect(templateMock.container).toBe('pubcon');
});
