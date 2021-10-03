import path from 'path';
import spawn from 'cross-spawn';
import stripVersion from './strip-version';

type NoParameterCallback<T = unknown> = (err: T) => void;

const buildInstallCommand = (options: {
  installPath: string;
  save?: boolean;
  isDev?: boolean;
}) => {
  const args = ['install', '--prefix', options.installPath];

  if (options.save) {
    args.push('--save-exact');
    args.push(options.isDev ? '--save-dev' : '--save');
  } else {
    args.push('--no-save');
  }

  return args;
};

const executeCommand = (
  options: { command: string[]; path: string; silent?: boolean },
  callback: NoParameterCallback<string | number | null>
) => {
  const cmd = spawn('npm', [...options.command, '--no-package-lock'], {
    cwd: options.path,
    stdio: options.silent ? 'ignore' : 'inherit'
  });

  cmd.on('error', () => callback('error'));
  cmd.on('close', code => callback(code !== 0 ? code : null));
};

const getFullPath = ({
  installPath,
  dependency
}: {
  installPath: string;
  dependency: string;
}) => path.join(installPath, 'node_modules', stripVersion(dependency));

export const init = (
  options: { initPath: string; silent: boolean },
  callback: NoParameterCallback<string | number | null>
): void => {
  const { initPath, silent } = options;
  const npminit = ['init', '--yes'];
  const cmdOptions = { path: initPath, command: npminit, silent };

  executeCommand(cmdOptions, callback);
};

export const installDependencies = (
  options: { dependencies: string[]; installPath: string; silent: boolean },
  callback: Callback<{ dest: string }, string | number>
): void => {
  const { dependencies, installPath, silent } = options;
  const npmi = buildInstallCommand(options);
  const cmdOptions = {
    command: [...npmi, ...dependencies],
    path: installPath,
    silent
  };

  const dest = dependencies.map(dependency =>
    getFullPath({ installPath, dependency })
  );

  executeCommand(cmdOptions, err =>
    callback(err, err ? (null as any) : { dest })
  );
};

export const installDependency = (
  options: { dependency: string; installPath: string; silent?: boolean },
  callback: Callback<{ dest: string }, string | number>
): void => {
  const { dependency, installPath, silent } = options;
  const npmi = buildInstallCommand(options);
  const cmdOptions = {
    command: [...npmi, dependency],
    path: installPath,
    silent
  };
  const dest = getFullPath({ installPath, dependency });

  executeCommand(cmdOptions, err =>
    callback(err, err ? (null as any) : { dest })
  );
};
