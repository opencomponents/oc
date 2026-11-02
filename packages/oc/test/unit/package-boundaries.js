const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const os = require('node:os');
const path = require('node:path');
const { expect } = require('chai');

describe('isolated package boundaries', () => {
  let tempDir;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-package-boundaries-'));

    for (const name of ['core', 'cli']) {
      const source = path.resolve(__dirname, '../../../', name);
      const destination = path.join(
        tempDir,
        'node_modules/@oc-framework',
        name
      );
      fs.mkdirSync(destination, { recursive: true });
      fs.copyFileSync(
        path.join(source, 'package.json'),
        path.join(destination, 'package.json')
      );
      fs.cpSync(path.join(source, 'dist'), path.join(destination, 'dist'), {
        recursive: true
      });

      const manifest = require(path.join(source, 'package.json'));
      const resolveFromPackage = createRequire(path.join(source, 'package.json'));
      for (const dependency of Object.keys(manifest.dependencies)) {
        if (dependency.startsWith('@oc-framework/')) continue;

        let dependencyRoot = path.dirname(resolveFromPackage.resolve(dependency));
        while (
          !fs.existsSync(path.join(dependencyRoot, 'package.json')) ||
          JSON.parse(
            fs.readFileSync(path.join(dependencyRoot, 'package.json'), 'utf8')
          ).name !== dependency
        ) {
          const parent = path.dirname(dependencyRoot);
          if (parent === dependencyRoot) {
            throw new Error(`Could not locate package ${dependency}`);
          }
          dependencyRoot = parent;
        }

        const link = path.join(destination, 'node_modules', dependency);
        fs.mkdirSync(path.dirname(link), { recursive: true });
        fs.symlinkSync(dependencyRoot, link, 'junction');
      }
    }

    for (const name of ['hello-world', 'welcome']) {
      fs.cpSync(
        path.resolve(__dirname, '../fixtures/components', name),
        path.join(tempDir, 'components', name),
        { recursive: true, filter: (source) => path.basename(source) !== '_package' }
      );
    }
    fs.copyFileSync(
      path.resolve(__dirname, '../../../registry/tasks/logger.js'),
      path.join(tempDir, 'registry-logger.js')
    );
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const run = (script) => {
    const result = spawnSync(process.execPath, ['-e', `
      let completed = false;
      const complete = () => { completed = true; };
      process.on('exit', () => { if (!completed) process.exitCode = 1; });
      ${script}
    `], {
      cwd: tempDir,
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, NODE_PATH: '' }
    });
    expect(result.error).to.equal(undefined);
    expect(result.status, result.stderr || result.stdout).to.equal(0);
  };

  for (const name of ['hello-world', 'welcome']) {
    it(`packages legacy ${name} without a registry or hoisted compilers`, () => {
      run(`
        const assert = require('node:assert/strict');
        const fs = require('node:fs');
        const path = require('node:path');
        const cli = require('@oc-framework/cli').default;
        const componentPath = path.resolve('components/${name}');
        cli.package({ componentPath, compress: false }, (error, component) => {
          assert.ifError(error);
          assert.equal(component.name, '${name}');
          assert.ok(fs.existsSync(path.join(componentPath, '_package/template.js')));
          complete();
        });
      `);
    });
  }

  it('does not install template compilers as registry runtime dependencies', () => {
    const manifest = require('../../../registry/package.json');
    expect(Object.keys(manifest.dependencies).filter((name) =>
      /^oc-template-.*-compiler$/.test(name)
    )).to.eql([]);
  });

  it('explains how to install the missing dev runtime', () => {
    run(`
      const assert = require('node:assert/strict');
      const cli = require('@oc-framework/cli').default;
      const logger = { log() {}, warn() {}, ok() {}, err() {} };
      cli.dev({
        dirPath: require('node:path').resolve('components'),
        hotReloading: false,
        watch: false,
        logger
      }, (error) => {
        assert.equal(error.message,
          'The dev command requires the registry runtime. Install the "oc" package for the full experience.');
        complete();
      });
    `);
  });

  it('explains how to install the missing metadata migration runtime', () => {
    run(`
      const assert = require('node:assert/strict');
      const fs = require('node:fs');
      fs.writeFileSync('registry-config.cjs', 'module.exports = {};');
      const migrate = require('@oc-framework/cli/dist/cli/facade/registry-migrate-metadata').default;
      const logger = { log() {}, warn() {}, ok() {}, err() {} };
      migrate({ logger })({ configPath: 'registry-config.cjs' }).then(
        () => assert.fail('Expected the runtime to be missing'),
        (error) => {
          assert.equal(error.message,
            'The registry migrate-metadata command requires the registry runtime. Install the "oc" package for the full experience.');
          complete();
        }
      );
    `);
  });

  it('loads the registry build logger using only declared dependencies', () => {
    run(`
      const logger = require('./registry-logger');
      for (const log of Object.values(logger)) log('ready');
      complete();
    `);
  });

  it('does not mistake a broken registry dependency for a missing runtime', () => {
    run(`
      const assert = require('node:assert/strict');
      const fs = require('node:fs');
      const path = require('node:path');
      const registryDir = 'node_modules/@oc-framework/registry';
      fs.mkdirSync(registryDir);
      fs.writeFileSync(registryDir + '/package.json',
        JSON.stringify({ name: '@oc-framework/registry', main: 'index.js' }));
      fs.writeFileSync(registryDir + '/index.js',
        "require('oc-missing-runtime-dependency');");
      fs.writeFileSync('registry-config.cjs', 'module.exports = {};');
      const cli = require('@oc-framework/cli').default;
      const migrate = require('@oc-framework/cli/dist/cli/facade/registry-migrate-metadata').default;
      const logger = { log() {}, warn() {}, ok() {}, err() {} };
      const checkError = (error) => {
        assert.equal(error.code, 'MODULE_NOT_FOUND');
        assert.match(error.message, /Cannot find module 'oc-missing-runtime-dependency'/);
      };
      (async () => {
        await new Promise(resolve => cli.dev({
          dirPath: path.resolve('components'),
          hotReloading: false,
          watch: false,
          logger
        }, (error) => { checkError(error); resolve(); }));
        await migrate({ logger })({ configPath: 'registry-config.cjs' }).then(
          () => assert.fail('Expected the registry dependency to be missing'),
          checkError
        );
        complete();
      })().catch(error => { console.error(error); process.exit(1); });
    `);
  });
});
