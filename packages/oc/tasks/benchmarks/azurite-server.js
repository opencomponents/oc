// Helper to start/stop a local Azurite blob service for stress benchmarks.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { promisify } = require('node:util');
const getPort = require('getport');

const getPortAsync = promisify(getPort);

const DEFAULT_ACCOUNT_NAME = 'devstoreaccount1';
const DEFAULT_ACCOUNT_KEY =
  'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isAzuriteReady = async (port) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    // Any response means the HTTP server is up; Azurite returns 400/403 before
    // authentication/valid request checks.
    return response.status >= 400;
  } catch {
    return false;
  }
};

const waitForAzurite = async (port, timeoutMs = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isAzuriteReady(port)) {
      return;
    }
    await wait(250);
  }
  throw new Error(
    `Azurite blob service did not become ready on port ${port} within ${timeoutMs}ms`
  );
};

const findAzuriteBlobBinary = () => {
  const candidates = [
    path.resolve('node_modules/.bin/azurite-blob'),
    path.resolve('packages/oc/node_modules/.bin/azurite-blob'),
    path.resolve(__dirname, '../../node_modules/.bin/azurite-blob'),
    path.resolve(__dirname, '../../../../node_modules/.bin/azurite-blob')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to module main and invoke blob service programmatically is not
  // supported by Azurite, so we rely on the CLI binary being available.
  throw new Error(
    'azurite-blob binary not found. Run npm install from the workspace root.'
  );
};

const startAzurite = async (options = {}) => {
  const port = options.port || (await getPortAsync());
  const accountName = options.accountName || DEFAULT_ACCOUNT_NAME;
  const accountKey = options.accountKey || DEFAULT_ACCOUNT_KEY;
  const inMemoryPersistence = options.inMemoryPersistence !== false;
  const silent = options.silent !== false;
  const location =
    options.location ||
    (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'oc-azurite-')));

  const binary = findAzuriteBlobBinary();
  const args = [
    '--blobHost',
    '127.0.0.1',
    '--blobPort',
    String(port),
    '--disableTelemetry',
    '--skipApiVersionCheck'
  ];

  if (inMemoryPersistence) {
    args.push('--inMemoryPersistence');
  } else {
    args.push('--location', location);
  }

  if (silent) {
    args.push('--silent');
  }

  const child = spawn(binary, args, {
    stdio: silent ? 'ignore' : ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AZURITE_ACCOUNTS: `${accountName}:${accountKey}`
    }
  });

  try {
    await waitForAzurite(port, options.timeoutMs || 30000);
  } catch (error) {
    child.kill();
    await fs.promises.rm(location, { recursive: true, force: true });
    throw error;
  }

  return {
    port,
    accountName,
    accountKey,
    endpoint: `http://127.0.0.1:${port}/${accountName}`,
    location,
    stop: async () => {
      child.kill();
      await new Promise((resolve) => {
        child.on('close', resolve);
        setTimeout(resolve, 1000);
      });
      await fs.promises.rm(location, { recursive: true, force: true });
    }
  };
};

module.exports = {
  startAzurite,
  DEFAULT_ACCOUNT_NAME,
  DEFAULT_ACCOUNT_KEY
};
