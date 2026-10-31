const assert = require('node:assert/strict');
const { test } = require('node:test');
const { s3 } = require('./mocks');

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

  const mockResult = await client.putDir('.', '.', (filePath) =>
    filePath.endsWith('template.js')
  );
  const serverMock = mockResult.find((x) => x.Key === './server.js');
  const envMock = mockResult.find((x) => x.Key === './.env');
  const packageMock = mockResult.find((x) => x.Key === './package.json');
  const templateMock = mockResult.find((x) => x.Key === './template.js');

  assert.equal(serverMock.ACL, 'public-read');
  assert.equal(envMock.ACL, 'public-read');
  assert.equal(packageMock.ACL, 'public-read');
  assert.equal(templateMock.ACL, 'authenticated-read');
});
