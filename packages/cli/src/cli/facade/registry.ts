import { fromPromise } from 'universalify';

const registry = () =>
  fromPromise((_opts: unknown): Promise<void> => {
    return Promise.resolve();
  });

export default registry;
