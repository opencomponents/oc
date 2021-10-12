import path from 'path';

import strings from '../../resources/index';
import { Local } from '../../types';
import { Logger } from '../logger';

const init =
  ({ local, logger }: { local: Local; logger: Logger }) =>
  (
    opts: {
      componentName: string;
      componentPath: string;
      templateType: string;
    },
    callback: Callback<string>
  ): void => {
    const templateType =
      typeof opts.templateType === 'undefined'
        ? 'oc-template-es6'
        : opts.templateType;
    const errors = strings.errors.cli;
    const messages = strings.messages.cli;
    const componentPath = path.join(process.cwd(), opts.componentPath);
    const componentName = path.basename(componentPath);

    local.init(
      {
        componentName,
        componentPath,
        templateType,
        logger
      },
      err => {
        if (err) {
          if (err === 'name not valid') {
            err = errors.NAME_NOT_VALID;
          }

          if (err === 'template type not valid') {
            err = errors.TEMPLATE_TYPE_NOT_VALID(templateType);
          }
          logger.err(errors.INIT_FAIL(err));
        } else {
          logger.log(messages.initSuccess(componentName, componentPath));
        }

        callback(err as any, componentName);
      }
    );
  };

export default init;

module.exports = init;
