import open from 'open';
import { fromPromise } from 'universalify';

import strings from '../../resources/index';
import { RegistryCli } from '../domain/registry';
import { Logger } from '../logger';

const preview = ({
  logger,
  registry
}: {
  logger: Logger;
  registry: RegistryCli;
}) =>
  fromPromise(async (opts: { componentHref: string }): Promise<string> => {
    try {
      const href = await registry.getComponentPreviewUrlByUrl(
        opts.componentHref
      );
      await open(href);
      return href;
    } catch (err) {
      logger.err(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
      throw strings.errors.cli.COMPONENT_HREF_NOT_FOUND;
    }
  });

export default preview;
