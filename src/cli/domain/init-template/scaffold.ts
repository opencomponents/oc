import fs from 'fs-extra';
import path from 'path';

import strings from '../../../resources';

interface ScaffoldOptions {
  compiler: string;
  compilerPath: string;
  componentName: string;
  componentPath: string;
  templateType: string;
}

export default function scaffold(
  options: ScaffoldOptions,
  callback: Callback<{ ok: true }, string>
) {
  const {
    compiler,
    compilerPath,
    componentName,
    componentPath,
    templateType
  } = options;

  const baseComponentPath = path.join(compilerPath, 'scaffold');
  const baseComponentFiles = path.join(baseComponentPath, 'src');
  const compilerPackage = fs.readJSONSync(
    path.join(compilerPath, 'package.json')
  );

  try {
    fs.copySync(baseComponentFiles, componentPath);

    const componentPackage = fs.readJSONSync(
      path.join(componentPath, 'package.json')
    );
    componentPackage.name = componentName;
    componentPackage.devDependencies[compiler] = compilerPackage.version;
    fs.writeJsonSync(componentPath + '/package.json', componentPackage, {
      spaces: 2
    });

    return callback(null, { ok: true });
  } catch (error) {
    const url =
      (compilerPackage.bugs && compilerPackage.bugs.url) ||
      `the ${templateType} repo`;
    return (callback as any)(strings.errors.cli.scaffoldError(url, error));
  }
}
