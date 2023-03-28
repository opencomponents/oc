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

export default async function scaffold(
  options: ScaffoldOptions
): Promise<{ ok: true }> {
  const { compiler, compilerPath, componentName, componentPath, templateType } =
    options;

  const baseComponentPath = path.join(compilerPath, 'scaffold');
  const baseComponentFiles = path.join(baseComponentPath, 'src');
  const compilerPackage = await fs.readJson(
    path.join(compilerPath, 'package.json')
  );

  try {
    await fs.copy(baseComponentFiles, componentPath);

    const componentPackage = await fs.readJson(
      path.join(componentPath, 'package.json')
    );
    componentPackage.name = componentName;
    componentPackage.scripts ??= {};
    componentPackage.scripts.start ??= `oc dev .. --components ${componentName}`;
    componentPackage.scripts.build ??= `oc package .`;
    componentPackage.devDependencies[compiler] = compilerPackage.version;
    await fs.writeJson(componentPath + '/package.json', componentPackage, {
      spaces: 2
    });

    return { ok: true };
  } catch (error) {
    const url =
      (compilerPackage.bugs && compilerPackage.bugs.url) ||
      `the ${templateType} repo`;
    throw strings.errors.cli.scaffoldError(url, String(error));
  }
}
