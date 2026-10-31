const expect = require('chai').expect;
const sinon = require('sinon');

const createProgram = require('../../dist/cli/program').default;
const commands = require('../../dist/cli/commands').default;
const validateCommand = require('../../dist/cli/validate-command').default;

describe('cli : program', () => {
  const program = createProgram({
    usage: commands.usage,
    commands: commands.commands,
    epilogue: 'Hint: Run -h with any command to show the help',
    version: '1.2.3',
    validate: validateCommand
  });

  const run = (args) => {
    const result = { output: [] };
    const log = sinon.stub(console, 'log').callsFake((x) => result.output.push(x));
    const error = sinon
      .stub(console, 'error')
      .callsFake((x) => result.output.push(x));
    const exit = sinon.stub(process, 'exit').callsFake((code) => {
      throw Object.assign(new Error('exit'), { exitCode: code });
    });
    try {
      program(args, (commandPath, argv) => {
        result.command = commandPath.join('-');
        result.argv = argv;
      });
    } catch (err) {
      result.exitCode = err.exitCode;
    } finally {
      log.restore();
      error.restore();
      exit.restore();
    }
    return result;
  };

  const scenarios = [
    {
      args: ['clean', 'components', '--yes'],
      command: 'clean',
      argv: { _: ['clean'], 'dir-path': 'components', dirPath: 'components', yes: true }
    },
    {
      args: ['clean', 'a', 'b', '--no-yes'],
      command: 'clean',
      argv: { _: ['clean', 'b'], 'dir-path': 'a', dirPath: 'a', yes: false }
    },
    {
      args: [
        'dev',
        '../all',
        '3001',
        '127.0.0.1:3001',
        '--fallback-registry-url',
        'http://another:4000/',
        '--hotReloading',
        'false',
        '--components',
        'a',
        'b',
        '--verbose'
      ],
      command: 'dev',
      argv: {
        _: ['dev'],
        'base-url': '127.0.0.1:3001',
        baseUrl: '127.0.0.1:3001',
        components: ['a', 'b'],
        'dir-path': '../all',
        dirPath: '../all',
        'fallback-registry-url': 'http://another:4000/',
        fallbackRegistryUrl: 'http://another:4000/',
        'hot-reloading': false,
        hotReloading: false,
        port: 3001,
        'post-request-payload-size': '100kb',
        postRequestPayloadSize: '100kb',
        prefix: '',
        production: false,
        verbose: true,
        watch: true
      }
    },
    {
      args: ['dev', '.', '0300', '--', '--weird'],
      command: 'dev',
      argv: {
        _: ['dev', '--weird'],
        'dir-path': '.',
        dirPath: '.',
        'hot-reloading': true,
        hotReloading: true,
        port: '0300',
        'post-request-payload-size': '100kb',
        postRequestPayloadSize: '100kb',
        prefix: '',
        production: false,
        verbose: false,
        watch: true
      }
    },
    {
      args: ['mock', 'plugin', 'num', '-5'],
      command: 'mock',
      argv: {
        _: ['mock'],
        'target-name': 'num',
        'target-type': 'plugin',
        'target-value': -5,
        targetName: 'num',
        targetType: 'plugin',
        targetValue: -5
      }
    },
    {
      args: ['publish', 'comp/', '--username', '123', '--password=007', '--registries', 'http://a/', 'http://b/'],
      command: 'publish',
      argv: {
        _: ['publish'],
        'component-path': 'comp/',
        componentPath: 'comp/',
        'dry-run': false,
        dryRun: false,
        password: '007',
        registries: ['http://a/', 'http://b/'],
        'skip-package': false,
        skipPackage: false,
        username: 123
      }
    },
    {
      args: ['registry', 'add', 'http://my-registry/'],
      command: 'registry-add',
      argv: {
        _: ['registry', 'add'],
        'registry-url': 'http://my-registry/',
        registryUrl: 'http://my-registry/'
      }
    },
    {
      args: ['registry', 'nope'],
      command: 'registry',
      argv: { _: ['registry'], command: 'nope' }
    }
  ];

  for (const scenario of scenarios) {
    it(`should parse "oc ${scenario.args.join(' ')}"`, () => {
      const result = run(scenario.args);
      expect(result.command).to.equal(scenario.command);
      expect(result.argv).to.deep.equal(scenario.argv);
    });
  }

  it('should fail when required positional arguments are missing', () => {
    const result = run(['registry', 'add']);
    expect(result.exitCode).to.equal(1);
    expect(result.command).to.be.undefined;
    expect(result.output.join('\n')).to.contain(
      'Not enough non-option arguments: got 0, need at least 1'
    );
  });

  it('should fail on unknown commands', () => {
    const result = run(['nope']);
    expect(result.exitCode).to.equal(1);
    expect(result.output.join('\n')).to.contain("No such command 'nope'");
  });

  it('should show the command help', () => {
    const result = run(['dev', '-h']);
    expect(result.exitCode).to.be.undefined;
    expect(result.command).to.be.undefined;
    expect(result.output[0]).to.contain(
      'dev <dirPath> [port] [baseUrl] [options]'
    );
    expect(result.output[0]).to.contain(
      '--hotReloading            Enable hot reloading.'
    );
  });

  it('should show the version', () => {
    expect(run(['--version']).output).to.deep.equal(['1.2.3']);
  });

  it('should list completions for subcommands', () => {
    const shell = process.env.SHELL;
    process.env.SHELL = '/bin/bash';
    const result = run(['--get-yargs-completions', 'oc', 'registry', '']);
    process.env.SHELL = shell;
    expect(result.output).to.deep.equal(['add\nls\nmigrate-metadata\nremove']);
  });
});
