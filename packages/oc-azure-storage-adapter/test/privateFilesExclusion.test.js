const assert = require('node:assert/strict');
const { test } = require('node:test');
const { azure } = require('./mocks');

test('put directory uses the supplied privacy classifier', async () => {
  const client = azure({
    publicContainerName: 'pubcon',
    privateContainerName: 'privcon',
    accountName: 'name',
    accountKey: 'key',
    path: '/',
    componentsDir: 'components'
  });

  const mockResult = await client.putDir('.', '.', (filePath) =>
    filePath.endsWith('template.js')
  );
  const serverMock = mockResult.find((x) => x.fileName === './server.js');
  const envMock = mockResult.find((x) => x.fileName === './.env');
  const packageMock = mockResult.find((x) => x.fileName === './package.json');
  const templateMock = mockResult.find((x) => x.fileName === './template.js');

  assert.equal(serverMock.container, 'pubcon');
  assert.equal(envMock.container, 'pubcon');
  assert.equal(packageMock.container, 'pubcon');
  assert.equal(templateMock.container, 'privcon');
});
