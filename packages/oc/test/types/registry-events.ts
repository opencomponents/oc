import type { RegistryErrorEvent, RegistryType } from '../../src';

declare const registry: RegistryType;

const handleError = (event: RegistryErrorEvent): void => {
  event.code;
  event.message;
};

registry.on('error', handleError);
