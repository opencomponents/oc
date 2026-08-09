import strings from '../../resources';
import type { CorsConfig, CorsOptions } from '../../types';
import type { OcHandler } from '../domain/http-server/types';

export const DEFAULT_CORS_CONFIG: CorsConfig = {
  origin: '*',
  credentials: true,
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, traceparent',
  methods: 'GET, OPTIONS, PUT, POST'
};

const asHeaderValue = (
  value: string | string[] | undefined,
  fallback: string
): string => (Array.isArray(value) ? value.join(', ') : (value ?? fallback));

export const normaliseCorsConfig = (
  options?: CorsOptions | null
): CorsConfig => ({
  origin: options?.origin ?? DEFAULT_CORS_CONFIG.origin,
  credentials: options?.credentials ?? DEFAULT_CORS_CONFIG.credentials,
  allowedHeaders: asHeaderValue(
    options?.allowedHeaders,
    DEFAULT_CORS_CONFIG.allowedHeaders
  ),
  methods: asHeaderValue(options?.methods, DEFAULT_CORS_CONFIG.methods)
});

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const validateCorsConfig = (options: unknown): string | undefined => {
  if (typeof options === 'undefined') {
    return undefined;
  }

  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    return strings.errors.registry.CONFIGURATION_CORS_MUST_BE_OBJECT;
  }

  const config = options as CorsOptions;

  if (
    typeof config.origin !== 'undefined' &&
    (typeof config.origin !== 'string' || config.origin.length === 0)
  ) {
    return strings.errors.registry.CONFIGURATION_CORS_ORIGIN_MUST_BE_STRING;
  }

  if (
    typeof config.credentials !== 'undefined' &&
    typeof config.credentials !== 'boolean'
  ) {
    return strings.errors.registry
      .CONFIGURATION_CORS_CREDENTIALS_MUST_BE_BOOLEAN;
  }

  if (
    typeof config.allowedHeaders !== 'undefined' &&
    typeof config.allowedHeaders !== 'string' &&
    !isStringArray(config.allowedHeaders)
  ) {
    return strings.errors.registry
      .CONFIGURATION_CORS_ALLOWED_HEADERS_MUST_BE_STRING_ARRAY;
  }

  if (
    typeof config.methods !== 'undefined' &&
    typeof config.methods !== 'string' &&
    !isStringArray(config.methods)
  ) {
    return strings.errors.registry
      .CONFIGURATION_CORS_METHODS_MUST_BE_STRING_ARRAY;
  }

  return undefined;
};

const cors: OcHandler = (_req, res) => {
  const options = normaliseCorsConfig(res.conf?.cors);

  res.removeHeader('X-Powered-By');
  res.set('Access-Control-Allow-Credentials', String(options.credentials));
  res.set('Access-Control-Allow-Origin', options.origin);
  res.set('Access-Control-Allow-Headers', options.allowedHeaders);
  res.set('Access-Control-Allow-Methods', options.methods);
};

export default cors;
