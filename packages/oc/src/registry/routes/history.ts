import type { OcHandler } from '../domain/http-server/types';
import type { Repository } from '../domain/repository';
import getComponentsHistory from './helpers/get-components-history';

export default function history(repository: Repository): OcHandler {
  return async (_req, res): Promise<void> => {
    try {
      if (res.conf.discovery.ui && !res.conf.local) {
        const details = await repository.getComponentsDetails();
        const componentsHistory = getComponentsHistory(details);
        res.set('Cache-Control', 'public, max-age=600');
        res.status(200).json({ componentsHistory });
      } else {
        res.status(401);
      }
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
