import { type SpawnOptions, spawn } from 'node:child_process';
import path from 'node:path';
import stripVersion from './strip-version';

const escapeWindowsArg = (arg: string) =>
  `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1')}"`.replace(
    /([()\][%!^"`<>&|;, *?])/g,
    '^$1'
  );

const spawnNpm = (args: string[], options: SpawnOptions) =>
  process.platform === 'win32'
    ? spawn(
        process.env['comspec'] || 'cmd.exe',
        ['/d', '/s', '/c', `"npm ${args.map(escapeWindowsArg).join(' ')}"`],
        { ...options, windowsVerbatimArguments: true }
      )
    : spawn('npm', args, options);

const buildInstallCommand = (options: {
  installPath: string;
  all?: boolean;
  save?: boolean;
  isDev?: boolean;
  usePrefix: boolean;
}) => {
  const args = ['install'];

  if (options.usePrefix) {
    args.push('--prefix', options.installPath);
  }

  if (options.all) return args;

  if (options.save) {
    args.push('--save-exact');
    args.push(options.isDev ? '--save-dev' : '--save');
  } else {
    args.push('--no-save');
  }

  return args;
};

const executeCommand = (options: {
  command: string[];
  path: string;
  silent?: boolean;
}) => {
  const cmd = spawnNpm([...options.command, '--no-package-lock'], {
    cwd: options.path,
    stdio: options.silent ? 'ignore' : 'inherit'
  });

  return new Promise<void>((res, rej) => {
    cmd.on('error', () => rej(new Error('error')));
    cmd.on('close', (code) => {
      if (code !== 0) {
        rej(code);
      } else {
        res();
      }
    });
  });
};

const getFullPath = ({
  installPath,
  dependency
}: {
  installPath: string;
  dependency: string;
}) => path.join(installPath, 'node_modules', stripVersion(dependency));

export const init = (options: {
  initPath: string;
  silent: boolean;
}): Promise<void> => {
  const { initPath, silent } = options;
  const npminit = ['init', '--yes'];
  const cmdOptions = { path: initPath, command: npminit, silent };

  return executeCommand(cmdOptions);
};

export const installDependencies = async (options: {
  dependencies?: string[];
  installPath: string;
  silent: boolean;
  usePrefix: boolean;
}): Promise<{ dest: string[] }> => {
  const { dependencies, installPath, silent } = options;
  const npmi = buildInstallCommand({
    ...options,
    all: !dependencies?.length
  });
  const cmdOptions = {
    command: [...npmi, ...(dependencies ?? [])],
    path: installPath,
    silent
  };

  const dest =
    dependencies?.map((dependency) =>
      getFullPath({ installPath, dependency })
    ) ?? [];

  await executeCommand(cmdOptions);

  return { dest };
};

export const installDependency = async (options: {
  dependency: string;
  installPath: string;
  silent?: boolean;
  usePrefix: boolean;
}): Promise<{ dest: string }> => {
  const { dependency, installPath, silent } = options;
  const npmi = buildInstallCommand(options);
  const cmdOptions = {
    command: [...npmi, dependency],
    path: installPath,
    silent
  };
  const dest = getFullPath({ installPath, dependency });

  await executeCommand(cmdOptions);

  return { dest };
};
