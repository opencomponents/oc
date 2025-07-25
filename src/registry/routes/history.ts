import type { Request, Response } from 'express';
import type { Repository } from '../domain/repository';
import getComponentsHistory from './helpers/get-components-history';

export default function history(repository: Repository) {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      if (res.conf.discovery && !res.conf.local) {
        const details = await repository.getComponentsDetails();
        const componentsHistory = getComponentsHistory(details);
        res.setHeader('Cache-Control', 'public, max-age=600');
        res.status(200).json({ componentsHistory });
      } else {
        res.status(401);
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
