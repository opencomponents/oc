import type { RegistryType as CoreRegistryType } from '@oc-framework/core';
import { cli, type RegistryType } from '../../src';

declare const options: Parameters<typeof cli.dev>[0];

cli.dev(options, (_error, registry) => {
  const publicRegistry: RegistryType = registry;
  const sharedRegistry: CoreRegistryType = publicRegistry;

  sharedRegistry.app.get('/health', (_req, res) => res.send('ok'));
  registry.on('error', (event) => {
    const code: string = event.code;
    code.toUpperCase();
  });
  registry.on('request', (event) => {
    const statusCode: number = event.statusCode;
    statusCode.toFixed();
  });
  registry.close((_error) => {});
  registry.start((_error, result) => result?.server.address());
  registry.register(
    {
      name: 'callback-plugin',
      register: {
        register: async () => {},
        execute: () => {}
      }
    },
    () => {}
  );
});
