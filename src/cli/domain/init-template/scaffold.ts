import fs from 'node:fs/promises';
import path from 'node:path';

import strings from '../../../resources';

interface ScaffoldOptions {
  compiler: string;
  compilerPath: string;
  componentName: string;
  componentPath: string;
  templateType: string;
}

const readJson = (path: string) => fs.readFile(path, 'utf8').then(JSON.parse);
const writeJson = (path: string, data: unknown) =>
  fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');

export default async function scaffold(
  options: ScaffoldOptions
): Promise<{ ok: true }> {
  const { compiler, compilerPath, componentName, componentPath, templateType } =
    options;

  const baseComponentPath = path.join(compilerPath, 'scaffold');
  const baseComponentFiles = path.join(baseComponentPath, 'src');
  const compilerPackage = await readJson(
    path.join(compilerPath, 'package.json')
  );

  try {
    await fs.cp(baseComponentFiles, componentPath, { recursive: true });

    const componentPackage = await readJson(
      path.join(componentPath, 'package.json')
    );
    componentPackage.name = componentName;
    componentPackage.scripts ??= {};
    componentPackage.scripts.start ??= `oc dev .. --components ${componentName}`;
    componentPackage.scripts.build ??= 'oc package .';
    componentPackage.devDependencies[compiler] = compilerPackage.version;
    await writeJson(componentPath + '/package.json', componentPackage);

    return { ok: true };
  } catch (error) {
    const url = compilerPackage.bugs?.url || `the ${templateType} repo`;
    throw strings.errors.cli.scaffoldError(url, String(error));
  }
}
