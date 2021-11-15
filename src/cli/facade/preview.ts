import open from 'open';

import strings from '../../resources/index';
import { RegistryCli } from '../../types';
import { Logger } from '../logger';

const preview =
  ({ logger, registry }: { logger: Logger; registry: RegistryCli }) =>
  (
    opts: { componentHref: string },
    callback: (err: string | null, data: string) => void
  ): void => {
    registry.getComponentPreviewUrlByUrl(opts.componentHref, (err, href) => {
      if (err) {
        logger.err(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
        return callback(
          strings.errors.cli.COMPONENT_HREF_NOT_FOUND,
          undefined as any
        );
      }
      open(href);
      callback(null, href);
    });
  };

export default preview;
