import fs from 'fs-extra';
import { promisify } from 'util';
import path from 'path';

import requireTemplate from './handle-dependencies/require-template';
import * as validator from '../../registry/domain/validators';
import { Component } from '../../types';

export interface PackageOptions {
  componentPath: string;
  minify?: boolean;
  verbose?: boolean;
  production?: boolean;
}

interface Sizes {
  client: number;
  server?: number;
}

function checkSizes(folder: string) {
  const jsFiles = fs.readdirSync(folder).filter(x => x.endsWith('.js'));

  const sizes: Sizes = {
    client: 0
  };

  for (const file of jsFiles) {
    if (file === 'server.js') {
      sizes.server = fs.statSync(path.join(folder, file)).size;
    } else {
      sizes.client += fs.statSync(path.join(folder, file)).size;
    }
  }

  return sizes;
}

function addSizes(folder: string, component: Component, sizes: Sizes) {
  component.oc.files.template.size = sizes.client;
  if (sizes.server) {
    component.oc.files.dataProvider.size = sizes.server;
  }

  fs.writeJsonSync(path.join(folder, 'package.json'), component, { spaces: 2 });
}

const packageComponents =
  () =>
  async (options: PackageOptions): Promise<Component> => {
    const production = options.production;
    const componentPath = options.componentPath;
    const minify = options.minify === true;
    const verbose = options.verbose === true;
    const publishPath = path.join(componentPath, '_package');
    const componentPackagePath = path.join(componentPath, 'package.json');
    const ocPackagePath = path.join(__dirname, '../../../package.json');

    if (!fs.existsSync(componentPackagePath)) {
      throw new Error('component does not contain package.json');
    } else if (!fs.existsSync(ocPackagePath)) {
      throw new Error('error resolving oc internal dependencies');
    }

    await fs.emptyDir(publishPath);

    const componentPackage: Component = await fs.readJson(componentPackagePath);
    const ocPackage: Component = await fs.readJson(ocPackagePath);

    if (!validator.validateComponentName(componentPackage.name)) {
      throw new Error('name not valid');
    }

    const type = componentPackage.oc.files.template.type;
    const compileOptions = {
      publishPath,
      componentPath,
      componentPackage,
      ocPackage,
      minify,
      verbose,
      production
    };

    const ocTemplate = requireTemplate(type, {
      compiler: true,
      componentPath
    });
    const compile = promisify(ocTemplate.compile);
    const component = await compile(compileOptions);

    addSizes(publishPath, component, checkSizes(publishPath));

    return component;
  };

export default packageComponents;
