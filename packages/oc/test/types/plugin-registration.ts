import type { RegistryType } from '../../src/registry';

declare const registry: RegistryType;

registry.register({
  name: 'promise-plugin',
  options: { token: 'secret' },
  register: {
    register: async (options, dependencies) => {
      options.token;
      dependencies.value;
    },
    execute: () => {}
  }
});

registry.register({
  name: 'callback-plugin',
  options: { token: 'secret' },
  register: {
    register: (options, dependencies, next) => {
      options.token;
      dependencies.value;
      next();
    },
    execute: () => {}
  }
});
