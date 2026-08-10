import type { RegistryOptions } from '../../src/registry';

const options: RegistryOptions = {
  baseUrl: 'https://components.example.com/',
  cors: {
    origin: 'https://app.example.com',
    credentials: false,
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
    methods: ['GET', 'OPTIONS']
  }
};

options.cors?.origin;
