import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import * as validator from '../../registry/domain/validators';
import type { Component } from '../../types';
import requireTemplate from './handle-dependencies/require-template';

const writeJsonSync = (path: string, data: unknown) =>
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
const readJson = (path: string) => fs.readFile(path, 'utf8').then(JSON.parse);

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
  const jsFiles = readdirSync(folder).filter((x) => x.endsWith('.js'));

  const sizes: Sizes = {
    client: 0
  };

  for (const file of jsFiles) {
    if (file === 'server.js') {
      sizes.server = statSync(path.join(folder, file)).size;
    } else {
      sizes.client += statSync(path.join(folder, file)).size;
    }
  }

  return sizes;
}

function addSizes(folder: string, component: Component, sizes: Sizes) {
  component.oc.files.template.size = sizes.client;
  if (sizes.server) {
    component.oc.files.dataProvider.size = sizes.server;
  }

  writeJsonSync(path.join(folder, 'package.json'), component);
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

    if (!existsSync(componentPackagePath)) {
      throw new Error('component does not contain package.json');
    }
    if (!existsSync(ocPackagePath)) {
      throw new Error('error resolving oc internal dependencies');
    }

    await fs.rm(publishPath, { recursive: true, force: true });
    await fs.mkdir(publishPath);

    const componentPackage: Component = await readJson(componentPackagePath);
    const ocPackage: Component = await readJson(ocPackagePath);

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
