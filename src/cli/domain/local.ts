import fs from 'fs-extra';
import targz from 'targz';

import * as clean from './clean';
import getComponentsByDir from './get-components-by-dir';
import initTemplate from './init-template';
import isTemplateLegacy from '../../utils/is-template-legacy';
import mock from './mock';
import packageComponents from './package-components';
import strings from '../../resources';
import * as validator from '../../registry/domain/validators';
import { Local } from '../../types';

export default function local(): Local {
  return {
    clean,
    cleanup(compressedPackagePath: string, callback) {
      return fs.unlink(compressedPackagePath, callback);
    },
    compress(input, output, callback) {
      return targz.compress(
        {
          src: input,
          dest: output,
          tar: {
            map: function (file) {
              return Object.assign(file, {
                name: `_package/${file.name}`
              });
            }
          }
        },
        callback
      );
    },
    getComponentsByDir: getComponentsByDir(),
    init(options, callback) {
      const { componentName, logger } = options;
      let { templateType } = options;
      if (!validator.validateComponentName(componentName)) {
        return callback('name not valid', undefined as any);
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
        initTemplate(
          Object.assign(options, {
            templateType,
            compiler: `${templateType}-compiler`
          }),
          callback as any
        );
      } catch (e) {
        return callback('template type not valid', undefined as any);
      }
    },
    mock: mock(),
    package: packageComponents()
  };
}
