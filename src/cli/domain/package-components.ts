import fs from 'fs-extra';
import path from 'path';

import requireTemplate from './handle-dependencies/require-template';
import * as validator from '../../registry/domain/validators';
import { Component } from '../../types';

interface PackageOptions {
  componentPath: string;
  minify?: boolean;
  verbose?: boolean;
  production?: boolean;
}

const packageComponents =
  () =>
  (options: PackageOptions, callback: Callback<Component>): void => {
    const production = options.production;
    const componentPath = options.componentPath;
    const minify = options.minify === true;
    const verbose = options.verbose === true;
    const publishPath = path.join(componentPath, '_package');
    const componentPackagePath = path.join(componentPath, 'package.json');
    const ocPackagePath = path.join(__dirname, '../../../package.json');

    if (!fs.existsSync(componentPackagePath)) {
      return callback(
        new Error('component does not contain package.json'),
        undefined as any
      );
    } else if (!fs.existsSync(ocPackagePath)) {
      return callback(
        new Error('error resolving oc internal dependencies'),
        undefined as any
      );
    }

    fs.emptyDirSync(publishPath);

    const componentPackage = fs.readJsonSync(componentPackagePath);
    const ocPackage = fs.readJsonSync(ocPackagePath);

    if (!validator.validateComponentName(componentPackage.name)) {
      return callback(new Error('name not valid'), undefined as any);
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

    try {
      const ocTemplate = requireTemplate(type, {
        compiler: true,
        componentPath
      });
      ocTemplate.compile!(compileOptions, callback);
    } catch (err) {
      return callback(err as any, undefined as any);
    }
  };

export default packageComponents;
