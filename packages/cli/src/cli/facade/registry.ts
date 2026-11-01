import { fromPromise } from '@oc-framework/core';

const registry = () =>
  fromPromise((_opts: unknown): Promise<void> => {
    return Promise.resolve();
  });

export default registry;
