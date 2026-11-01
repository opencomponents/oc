import {
  compress as compressTar,
  deprecate,
  isTemplateLegacy,
  validateComponentName
} from '@oc-framework/core';
import fs from 'fs-extra';
import type { Logger } from '../logger';
import * as clean from './clean';
import getComponentsByDir from './get-components-by-dir';
import initTemplate from './init-template';
import mock from './mock';
import packageComponents from './package-components';

export default function local() {
  return {
    clean,
    cleanup(compressedPackagePath: string): Promise<void> {
      return fs.unlink(compressedPackagePath);
    },
    compress(input: string, output: string): Promise<void> {
      return compressTar(input, output, '_package');
    },
    getComponentsByDir: getComponentsByDir(),
    async init(options: {
      componentName: string;
      logger: Logger;
      componentPath: string;
      templateType: string;
    }): Promise<void> {
      const { componentName } = options;
      let { templateType } = options;
      if (!validateComponentName(componentName)) {
        throw 'name not valid';
      }

      if (isTemplateLegacy(templateType)) {
        const legacyName = templateType;
        templateType = legacyName.replace(
          legacyName,
          `oc-template-${legacyName}`
        );
        deprecate({
          id: `cli-init-legacy-template-${legacyName}`,
          subject: `The bare \`${legacyName}\` template type`,
          replacement: 'the modern ESM component runtime (`oc-template-es6`)'
        });
      }
      try {
        await initTemplate(
          Object.assign(options, {
            templateType,
            compiler: `${templateType}-compiler`
          })
        );
      } catch {
        throw 'template type not valid';
      }
    },
    mock: mock(),
    package: packageComponents()
  };
}

export type Local = ReturnType<typeof local>;
