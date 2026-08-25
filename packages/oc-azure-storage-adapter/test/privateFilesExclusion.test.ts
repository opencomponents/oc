/* eslint-disable @typescript-eslint/no-non-null-assertion */
import adapter from '../src';

test('put directory uses the supplied privacy classifier', async () => {
  const client = adapter({
    publicContainerName: 'pubcon',
    privateContainerName: 'privcon',
    accountName: 'name',
    accountKey: 'key',
    path: '/',
    componentsDir: 'components'
  });

  const mockResult = (await client.putDir('.', '.', (filePath) =>
    filePath.endsWith('template.js')
  )) as Array<{
    fileName: string;
    container: string;
  }>;
  const serverMock = mockResult.find((x) => x.fileName === `./server.js`)!;
  const envMock = mockResult.find((x) => x.fileName === './.env')!;
  const packageMock = mockResult.find((x) => x.fileName === './package.json')!;
  const templateMock = mockResult.find((x) => x.fileName === './template.js')!;

  expect(serverMock.container).toBe('pubcon');
  expect(envMock.container).toBe('pubcon');
  expect(packageMock.container).toBe('pubcon');
  expect(templateMock.container).toBe('privcon');
});
