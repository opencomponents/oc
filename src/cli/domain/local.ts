import { promisify } from 'node:util';
import fs from 'fs-extra';
import targz from 'targz';

import * as validator from '../../registry/domain/validators';
import strings from '../../resources';
import isTemplateLegacy from '../../utils/is-template-legacy';
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
      return promisify(targz.compress)({
        src: input,
        dest: output,
        tar: {
          map: (file) =>
            Object.assign(file, {
              name: `_package/${file.name}`
            })
        }
      });
    },
    getComponentsByDir: getComponentsByDir(),
    async init(options: {
      componentName: string;
      logger: Logger;
      componentPath: string;
      templateType: string;
    }): Promise<void> {
      const { componentName, logger } = options;
      let { templateType } = options;
      if (!validator.validateComponentName(componentName)) {
        throw 'name not valid';
      }

      // LEGACY TEMPLATES WARNING
      if (isTemplateLegacy(templateType)) {
        const legacyName = templateType;
        templateType = legacyName.replace(
          legacyName,
          `oc-template-${legacyName}`
        );
        logger.warn(
          strings.messages.cli.legacyTemplateDeprecationWarning(
            legacyName,
            templateType
          )
        );
      }
      try {
        await initTemplate(
          Object.assign(options, {
            templateType,
            compiler: `${templateType}-compiler`
          })
        );
      } catch (e) {
        throw 'template type not valid';
      }
    },
    mock: mock(),
    package: packageComponents()
  };
}

export type Local = ReturnType<typeof local>;
