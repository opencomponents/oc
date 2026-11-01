import { fromPromise } from '../../utils/universalify';

const registry = () =>
  fromPromise((_opts: unknown): Promise<void> => {
    return Promise.resolve();
  });

export default registry;
