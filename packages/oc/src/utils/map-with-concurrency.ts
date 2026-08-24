export default function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  concurrency: number,
  worker: (item: Input, index: number) => Promise<Output>
): Promise<Output[]> {
  if (
    !(
      (Number.isInteger(concurrency) ||
        concurrency === Number.POSITIVE_INFINITY) &&
      concurrency > 0
    )
  ) {
    throw new TypeError('Expected `concurrency` to be a number from 1 and up');
  }

  if (items.length === 0) {
    return Promise.resolve([] as Output[]);
  }

  const results = new Array<Output>(items.length);
  let nextIndex = 0;
  let failed = false;
  let hasFirstError = false;
  let firstError: unknown;

  const numWorkers = Math.min(concurrency, items.length);

  const workerLoop = async (): Promise<void> => {
    while (true) {
      if (failed) {
        return;
      }
      const current = nextIndex++;
      if (current >= items.length) {
        return;
      }
      try {
        const value = await worker(items[current] as Input, current);
        results[current] = value;
      } catch (err) {
        if (!hasFirstError) {
          hasFirstError = true;
          firstError = err;
        }
        failed = true;
        throw err;
      }
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < numWorkers; i++) {
    workers.push(workerLoop());
  }

  return Promise.all(workers).then(
    () => results,
    (err) => {
      if (hasFirstError) {
        throw firstError;
      }
      throw err;
    }
  );
}
