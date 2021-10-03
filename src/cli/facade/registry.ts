const registry = () => (opts: unknown, callback: Callback<'ok'>): void => {
  callback(null, 'ok');
};

export default registry;

module.exports = registry;
