class Node {
  value: any;
  next: any;

  constructor(value: any) {
    this.value = value;
  }
}

class Queue<ValueType> {
  #head: any;
  #tail: any;
  #size: any;

  constructor() {
    this.clear();
  }

  enqueue(value: ValueType) {
    const node = new Node(value);

    if (this.#head) {
      this.#tail.next = node;
      this.#tail = node;
    } else {
      this.#head = node;
      this.#tail = node;
    }

    this.#size++;
  }

  dequeue(): ValueType | undefined {
    const current = this.#head;
    if (!current) {
      return;
    }

    this.#head = this.#head.next;
    this.#size--;
    return current.value;
  }

  clear(): void {
    this.#head = undefined;
    this.#tail = undefined;
    this.#size = 0;
  }

  get size() {
    return this.#size;
  }

  *[Symbol.iterator]() {
    let current = this.#head;

    while (current) {
      yield current.value;
      current = current.next;
    }
  }
}

export type LimitFunction = {
  readonly activeCount: number;

  readonly pendingCount: number;

  clearQueue: () => void;

  <Arguments extends unknown[], ReturnType>(
    fn: (...arguments_: Arguments) => PromiseLike<ReturnType> | ReturnType,
    ...arguments_: Arguments
  ): Promise<ReturnType>;
};

const pLimit = (concurrency: number): LimitFunction => {
  if (
    !(
      (Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) &&
      concurrency > 0
    )
  ) {
    throw new TypeError('Expected `concurrency` to be a number from 1 and up');
  }

  const queue = new Queue<any>();
  let activeCount = 0;

  const next = () => {
    activeCount--;

    if (queue.size > 0) {
      queue.dequeue()();
    }
  };

  const run = async (fn: any, resolve: any, ...args: any) => {
    activeCount++;

    // eslint-disable-next-line require-await
    const result = (async () => fn(...args))();

    resolve(result);

    try {
      await result;
    } catch {}

    next();
  };

  const enqueue = (fn: any, resolve: any, ...args: any) => {
    queue.enqueue(run.bind(null, fn, resolve, ...args));

    (async () => {
      // This function needs to wait until the next microtask before comparing
      // `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
      // when the run function is dequeued and called. The comparison in the if-statement
      // needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
      await Promise.resolve();

      if (activeCount < concurrency && queue.size > 0) {
        queue.dequeue()();
      }
    })();
  };

  const generator = <Arguments extends unknown[], ReturnType>(
    fn: (...args: Arguments) => PromiseLike<ReturnType> | ReturnType,
    ...args: Arguments
  ) =>
    new Promise((resolve) => {
      enqueue(fn, resolve, ...args);
    });

  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.size
    },
    clearQueue: {
      value: () => {
        queue.clear();
      }
    }
  });

  return generator as any;
};

export default pLimit;
