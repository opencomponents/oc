type Callback<T> = (error: any, value: T) => void;

export function fromCallback<Arguments extends readonly unknown[], ReturnValue>(
  fn: (...args: [...Arguments, Callback<ReturnValue>]) => void
): {
  (...args: Arguments): Promise<ReturnValue>;
  (...args: [...Arguments, Callback<ReturnValue>]): void;
} {
  return Object.defineProperty(
    function (this: unknown, ...args: any[]) {
      if (typeof args[args.length - 1] === 'function') {
        return void fn.apply(this, args as any);
      }
      return new Promise((resolve, reject) => {
        args.push((err: unknown, res: ReturnValue) =>
          err != null ? reject(err) : resolve(res)
        );
        fn.apply(this, args as any);
      });
    },
    'name',
    { value: fn.name }
  ) as any;
}

export function fromPromise<Arguments extends readonly unknown[], ReturnValue>(
  fn: (...args: Arguments) => Promise<ReturnValue>
): {
  (...args: Arguments): Promise<ReturnValue>;
  (...args: [...Arguments, Callback<ReturnValue>]): void;
} {
  return Object.defineProperty(
    function (this: unknown, ...args: any[]) {
      const cb = args[args.length - 1];
      if (typeof cb !== 'function') return fn.apply(this, args as any);
      args.pop();
      fn.apply(this, args as any).then((r) => cb(null, r), cb);
      return undefined;
    },
    'name',
    { value: fn.name }
  ) as any;
}
