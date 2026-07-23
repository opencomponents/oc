const fs = require('node:fs');
const path = require('node:path');

const FILE_NOT_FOUND_CODE = 'file_not_found';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomLatency = (min, max) => {
  if (max <= min) return min;
  const range = max - min;
  return min + Math.floor(Math.random() * (range + 1));
};

const toLocalPath = (fixtureRoot, filePath) => {
  const safePath = String(filePath || '').replace(/^\/+/, '');
  return path.normalize(path.join(fixtureRoot, safePath));
};

const createStorageAdapter = (options) => {
  const minLatencyMs = options.minLatencyMs ?? 5;
  const maxLatencyMs = options.maxLatencyMs ?? 25;
  const maxConcurrentRequests = options.maxConcurrentRequests ?? 128;
  const fixtureRoot = path.resolve(options.fixturesRoot);
  let activeReads = 0;
  let peakConcurrentReads = 0;

  const withLatency = async (fn) => {
    activeReads++;
    peakConcurrentReads = Math.max(peakConcurrentReads, activeReads);
    try {
      await wait(randomLatency(minLatencyMs, maxLatencyMs));
      return await fn();
    } finally {
      activeReads--;
    }
  };

  const readTextFile = async (relativePath) =>
    withLatency(async () => {
      const localPath = toLocalPath(fixtureRoot, relativePath);
      try {
        return await fs.promises.readFile(localPath, 'utf8');
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          const notFoundError = new Error(`File not found: ${relativePath}`);
          notFoundError.code = FILE_NOT_FOUND_CODE;
          throw notFoundError;
        }
        throw error;
      }
    });

  return {
    adapterType: 'benchmark-memory',
    maxConcurrentRequests,
    getMetrics() {
      return { activeReads, peakConcurrentReads };
    },
    resetMetrics() {
      peakConcurrentReads = activeReads;
    },
    async getFile(filePath) {
      return readTextFile(filePath);
    },
    async getJson(filePath) {
      const content = await readTextFile(filePath);
      return JSON.parse(content);
    },
    async listSubDirectories(directoryPath) {
      return withLatency(async () => {
        const localPath = toLocalPath(fixtureRoot, directoryPath);
        try {
          const entries = await fs.promises.readdir(localPath, {
            withFileTypes: true
          });

          return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
        } catch (error) {
          if (error && error.code === 'ENOENT') {
            const notFoundError = new Error(
              `Directory not found: ${directoryPath}`
            );
            notFoundError.code = 'dir_not_found';
            throw notFoundError;
          }
          throw error;
        }
      });
    },
    async putDir() {
      // Benchmark harness does not publish components.
    },
    async putFile() {
      // Benchmark harness does not publish components.
    },
    async putFileContent(content, filePath) {
      await withLatency(async () => {
        const localPath = toLocalPath(fixtureRoot, filePath);
        await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
        await fs.promises.writeFile(localPath, content);
      });
    },
    getUrl(filePath) {
      return `benchmark://${filePath}`;
    }
  };
};

module.exports = createStorageAdapter;
