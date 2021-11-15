const registry =
  () =>
  (_opts: unknown, callback: (err: Error | null, data: 'ok') => void): void => {
    callback(null, 'ok');
  };

export default registry;
