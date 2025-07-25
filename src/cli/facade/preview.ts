import open from 'open';
import { fromPromise } from 'universalify';

import strings from '../../resources/index';
import type { RegistryCli } from '../domain/registry';
import type { Logger } from '../logger';

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
    } catch {
      logger.err(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
      throw strings.errors.cli.COMPONENT_HREF_NOT_FOUND;
    }
  });

export default preview;
