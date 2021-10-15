import { fromPromise } from 'universalify';

const registry = () =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromPromise((_opts: unknown): Promise<void> => {
    return Promise.resolve();
  });

export default registry;
