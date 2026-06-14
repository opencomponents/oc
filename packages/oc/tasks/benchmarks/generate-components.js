// Generates many copies of a base component and uploads them to an Azurite-backed
// storage adapter so the registry can be stress-tested against a large registry.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const getUnixUTCTimestamp = require('oc-get-unix-utc-timestamp');

const copyDirectory = async (source, destination) => {
  await fs.promises.mkdir(destination, { recursive: true });
  await fs.promises.cp(source, destination, {
    recursive: true,
    force: true
  });
};

const padNumber = (number, length) => String(number).padStart(length, '0');

const buildLargeString = (length) =>
  Array.from({ length }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');

const injectLargeMetadata = (packageJson, componentName) => {
  // Make each component's metadata large enough that loading many of them
  // stresses the registry's caches and JSON serialization paths.
  const parameterCount = 50;
  const dependencies = {};
  const parameters = {};

  for (let i = 0; i < parameterCount; i += 1) {
    dependencies[`stress-dep-${i}`] = `^1.0.${i}`;
    parameters[`param-${i}`] = {
      description: buildLargeString(200),
      example: buildLargeString(100),
      mandatory: false,
      type: 'string'
    };
  }

  packageJson.dependencies = dependencies;
  packageJson.keywords = Array.from({ length: 50 }, (_, i) =>
    buildLargeString(20)
  );
  packageJson.description = buildLargeString(2000);
  packageJson.author = {
    name: buildLargeString(100),
    email: `${componentName}@example.com`
  };

  if (packageJson.oc) {
    packageJson.oc.parameters = parameters;
  }
};

const generateComponentFixtures = async ({
  count,
  baseComponentPath,
  outputRoot,
  version = '1.0.0'
}) => {
  const components = [];
  const packageIndexLength = String(count).length;

  await fs.promises.mkdir(outputRoot, { recursive: true });

  for (let index = 1; index <= count; index += 1) {
    const componentName = `stress-component-${padNumber(
      index,
      packageIndexLength
    )}`;
    const componentDir = path.join(outputRoot, componentName, version);
    await copyDirectory(baseComponentPath, componentDir);

    const packageJsonPath = path.join(componentDir, 'package.json');
    const packageJson = JSON.parse(
      await fs.promises.readFile(packageJsonPath, 'utf8')
    );
    packageJson.name = componentName;
    injectLargeMetadata(packageJson, componentName);
    await fs.promises.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );

    components.push({ name: componentName, version });
  }

  return components;
};

const uploadFixturesToAzurite = async ({
  fixturesRoot,
  componentsDir,
  storageAdapter
}) => {
  const uploadFile = async (localPath, blobPath) => {
    const content = await fs.promises.readFile(localPath);
    await storageAdapter.putFileContent(
      content,
      `${componentsDir}/${blobPath}`,
      true
    );
  };

  const walk = async (dir, relativeDir = '') => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const localPath = path.join(dir, entry.name);
      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        await walk(localPath, relativePath);
      } else {
        await uploadFile(localPath, relativePath);
      }
    }
  };

  await walk(fixturesRoot);
};

const generateAndUploadComponents = async ({
  count,
  storageAdapter,
  componentsDir = 'components',
  baseComponentPath = path.resolve(
    __dirname,
    '../../test/fixtures/benchmark-components/welcome-with-plugin/_package'
  ),
  ocClientPath = path.resolve(__dirname, '../../dist/components/oc-client/_package'),
  ocClientVersion
}) => {
  const tempRoot = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'oc-benchmark-components-')
  );

  try {
    const components = await generateComponentFixtures({
      count,
      baseComponentPath,
      outputRoot: path.join(tempRoot, componentsDir),
      version: '1.0.0'
    });

    // Include oc-client so the registry does not need to publish it on startup.
    const ocClientTargetDir = path.join(
      tempRoot,
      componentsDir,
      'oc-client',
      ocClientVersion
    );
    await copyDirectory(ocClientPath, ocClientTargetDir);

    // Pre-generate components.json so the registry can start faster.
    const componentsList = {
      lastEdit: getUnixUTCTimestamp(),
      components: {
        'oc-client': [ocClientVersion]
      }
    };
    const componentsDetails = {
      lastEdit: getUnixUTCTimestamp(),
      components: {}
    };

    for (const component of components) {
      componentsList.components[component.name] = [component.version];
    }

    const allComponents = [
      ...components,
      { name: 'oc-client', version: ocClientVersion }
    ];
    for (const component of allComponents) {
      const packageJson = JSON.parse(
        await fs.promises.readFile(
          path.join(
            tempRoot,
            componentsDir,
            component.name,
            component.version,
            'package.json'
          ),
          'utf8'
        )
      );
      componentsDetails.components[component.name] = {
        [component.version]: {
          publishDate: packageJson.oc.date || getUnixUTCTimestamp(),
          templateSize: packageJson.oc.files.template.size
        }
      };
    }

    await fs.promises.writeFile(
      path.join(tempRoot, componentsDir, 'components.json'),
      JSON.stringify(componentsList)
    );
    await fs.promises.writeFile(
      path.join(tempRoot, componentsDir, 'components-details.json'),
      JSON.stringify(componentsDetails)
    );

    // Upload everything to Azurite.
    await uploadFixturesToAzurite({
      fixturesRoot: path.join(tempRoot, componentsDir),
      componentsDir,
      storageAdapter
    });

    return {
      components,
      ocClientVersion,
      tempRoot,
      dispose: async () => {
        await fs.promises.rm(tempRoot, { recursive: true, force: true });
      }
    };
  } catch (error) {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
};

module.exports = {
  generateAndUploadComponents,
  generateComponentFixtures,
  uploadFixturesToAzurite
};
