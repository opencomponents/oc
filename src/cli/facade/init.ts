import path from 'path';
import { fromPromise } from 'universalify';

import strings from '../../resources/index';
import { Local } from '../../types';
import { toOcError } from '../../utils/errors';
import { Logger } from '../logger';

const init = ({ local, logger }: { local: Local; logger: Logger }) =>
  fromPromise(
    async (opts: {
      componentName: string;
      componentPath: string;
      templateType: string;
    }): Promise<string> => {
      const templateType =
        typeof opts.templateType === 'undefined'
          ? 'oc-template-es6'
          : opts.templateType;
      const errors = strings.errors.cli;
      const messages = strings.messages.cli;
      const componentPath = path.join(process.cwd(), opts.componentPath);
      const componentName = path.basename(componentPath);

      try {
        await local.init({
          componentName,
          componentPath,
          templateType,
          logger
        });

        logger.log(messages.initSuccess(componentName, componentPath));

        return componentName;
      } catch (err: unknown) {
        const error = toOcError(err);
        let errMsg = error.message;

        if (errMsg === 'name not valid') {
          errMsg = errors.NAME_NOT_VALID;
        } else if (errMsg === 'template type not valid') {
          errMsg = errors.TEMPLATE_TYPE_NOT_VALID(templateType);
        }

        logger.err(errors.INIT_FAIL(errMsg));
        throw error;
      }
    }
  );

export default init;
