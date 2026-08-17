const fs = require('node:fs');
const path = require('node:path');

const FILE_NOT_FOUND_CODE = 'file_not_found';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomLatency = (min, max) => {
  if (max <= min) return min;
  const range = max - min;
  return min + Math.floor(Math.random() * (range + 1));
};

const normalizeMetricPath = (filePath) => {
  const normalized = path.posix.normalize(
    String(filePath || '').replaceAll('\\', '/').replace(/^\/+/, '')
  );
  if (normalized === '..' || normalized.startsWith('../')) {
    const error = new Error('Path escapes fixture root');
    error.code = 'invalid_path';
    throw error;
  }
  return normalized === '.' ? '' : normalized.replace(/^\.\//, '');
};

const toLocalPath = (fixtureRoot, filePath) => {
  if (!fixtureRoot || !path.isAbsolute(fixtureRoot)) {
    throw new Error('Fixture root is not configured');
  }
  const localPath = path.resolve(fixtureRoot, normalizeMetricPath(filePath));
  const relativePath = path.relative(fixtureRoot, localPath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    const error = new Error('Path escapes fixture root');
    error.code = 'invalid_path';
    throw error;
  }
  return localPath;
};

const createOperationCounts = () => ({
  getFile: 0,
  getJson: 0,
  listSubDirectories: 0
});

const createStorageAdapter = (options) => {
  const minLatencyMs = options.minLatencyMs ?? 5;
  const maxLatencyMs = options.maxLatencyMs ?? 25;
  const maxConcurrentRequests = options.maxConcurrentRequests ?? 128;
  const fixtureRoot = options.fixturesRoot
    ? path.resolve(options.fixturesRoot)
    : null;
  const files = options.files
    ? new Map(
        [...options.files].map(([filePath, content]) => [
          normalizeMetricPath(filePath),
          String(content)
        ])
      )
    : null;
  const directories = options.directories
    ? new Map(
        [...options.directories].map(([directoryPath, entries]) => [
          normalizeMetricPath(directoryPath),
          [...entries]
        ])
      )
    : null;
  let activeReads = 0;
  let peakConcurrentReads = 0;
  let completedByOperation = createOperationCounts();
  let completedByPath = {};

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

  const recordCompletion = (operation, filePath) => {
    const normalizedPath = normalizeMetricPath(filePath);
    completedByOperation[operation]++;
    completedByPath[normalizedPath] ||= {
      total: 0,
      byOperation: createOperationCounts()
    };
    completedByPath[normalizedPath].total++;
    completedByPath[normalizedPath].byOperation[operation]++;
  };

  const publicRead = async (operation, filePath, fn) => {
    try {
      return await withLatency(fn);
    } finally {
      recordCompletion(operation, filePath);
    }
  };

  const fileNotFound = (filePath) => {
    const error = new Error(`File not found: ${filePath}`);
    error.code = FILE_NOT_FOUND_CODE;
    return error;
  };

  const readTextFile = async (relativePath) => {
    const normalizedPath = normalizeMetricPath(relativePath);
    if (files) {
      if (!files.has(normalizedPath)) throw fileNotFound(relativePath);
      return files.get(normalizedPath);
    }

    try {
      return await fs.promises.readFile(
        toLocalPath(fixtureRoot, relativePath),
        'utf8'
      );
    } catch (error) {
      if (error && error.code === 'ENOENT') throw fileNotFound(relativePath);
      throw error;
    }
  };

  return {
    adapterType: 'benchmark-memory',
    maxConcurrentRequests,
    getMetrics() {
      const byOperation = { ...completedByOperation };
      return {
        activeReads,
        peakConcurrentReads,
        completedOperations: {
          total: Object.values(byOperation).reduce(
            (sum, value) => sum + value,
            0
          ),
          byOperation,
          byPath: JSON.parse(JSON.stringify(completedByPath))
        }
      };
    },
    resetMetrics() {
      completedByOperation = createOperationCounts();
      completedByPath = {};
      peakConcurrentReads = activeReads;
    },
    async waitForIdle() {
      while (activeReads > 0) await wait(1);
    },
    async getFile(filePath) {
      return publicRead('getFile', filePath, () => readTextFile(filePath));
    },
    async getJson(filePath) {
      return publicRead('getJson', filePath, async () =>
        JSON.parse(await readTextFile(filePath))
      );
    },
    async listSubDirectories(directoryPath) {
      return publicRead('listSubDirectories', directoryPath, async () => {
        const normalizedPath = normalizeMetricPath(directoryPath);
        if (directories) {
          if (directories.has(normalizedPath)) {
            return [...directories.get(normalizedPath)].sort();
          }
          const error = new Error(`Directory not found: ${directoryPath}`);
          error.code = 'dir_not_found';
          throw error;
        }

        try {
          const entries = await fs.promises.readdir(
            toLocalPath(fixtureRoot, directoryPath),
            { withFileTypes: true }
          );
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
        if (files) {
          files.set(normalizeMetricPath(filePath), String(content));
          return;
        }
        const localPath = toLocalPath(fixtureRoot, filePath);
        await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
        await fs.promises.writeFile(localPath, content);
      });
    },
    getUrl(filePath) {
      return `benchmark://${normalizeMetricPath(filePath)}`;
    }
  };
};

module.exports = createStorageAdapter;
