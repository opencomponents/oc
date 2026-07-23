import { randomUUID } from 'node:crypto';
import Domain from 'node:domain';
import type { IncomingHttpHeaders } from 'node:http';
import vm from 'node:vm';
import acceptLanguageParser from 'accept-language-parser';
import Cache from 'nice-cache';
import Client from 'oc-client';
import emptyResponseHandler from 'oc-empty-response-handler';
import { fromPromise } from 'universalify';
import strings from '../../../resources';
import settings from '../../../resources/settings';
import type { Component, Config, PluginContext, Plugins } from '../../../types';
import isTemplateLegacy from '../../../utils/is-template-legacy';
import eventsHandler from '../../domain/events-handler';
import type { CookieOptions } from '../../domain/http-server/types';
import NestedRenderer from '../../domain/nested-renderer';
import type { Repository } from '../../domain/repository';
import RequireWrapper from '../../domain/require-wrapper';
import * as sanitiser from '../../domain/sanitiser';
import * as urlBuilder from '../../domain/url-builder';
import * as validator from '../../domain/validators';
import { validateTemplateOcVersion } from '../../domain/validators';
import applyDefaultValues from './apply-default-values';
import { processStackTrace } from './format-error-stack';
import * as getComponentFallback from './get-component-fallback';
import GetComponentRetrievingInfo from './get-component-retrieving-info';

export interface RendererOptions {
  action?: string;
  conf: Config;
  headers: IncomingHttpHeaders;
  ip: string;
  name: string;
  parameters: Record<string, string>;
  version: string;
  omitHref?: boolean;
}

export interface GetComponentResult {
  status: number;
  headers?: Record<string, string>;
  cookies?: Array<{
    name: string;
    value: any;
    options?: CookieOptions;
  }>;
  response: {
    data?: any;
    type?: string;
    code?: string;
    error?: unknown;
    version?: string;
    html?: string;
    renderMode?: string;
    requestVersion?: string;
    name?: string;
    details?: {
      message: string;
      stack: string;
      originalError: unknown;
    };
    missingPlugins?: string[];
    missingDependencies?: string[];
  };
}

export const stream = Symbol('stream');
const noop = () => {};
const noopConsole = Object.fromEntries(
  Object.keys(console).map((key) => [key, noop])
);

const parseTemplatesHeader = (templates: string): string[] => {
  const result: string[] = [];
  let start = 0;

  for (let index = 0; index <= templates.length; index++) {
    const char = templates[index];
    if (char === ',' || char === ';' || index === templates.length) {
      result.push(templates.slice(start, index));
      start = templates.indexOf(';', index);
      if (start === -1) {
        break;
      }
      index = start;
      start++;
    }
  }

  return result;
};

/**
 * Converts the plugins to a function that returns a record of plugins with the context applied
 * Caches the plugins without context and applies the context to the plugins that need it
 * to avoid creating a new function for each component if possible
 * @param plugins - The plugins to convert
 * @returns A function that returns a record of plugins with the context applied
 */
function pluginConverter(plugins: Plugins = {}) {
  const pluginsMap = {
    withoutContext: {} as Record<string, (...args: any[]) => any>,
    withContext: {} as Record<
      string,
      (ctx: PluginContext) => (...args: any[]) => any
    >,
    needsContext: false
  };
  for (const [name, { handler, context }] of Object.entries(plugins)) {
    if (context) {
      pluginsMap.withContext[name] = handler as any;
      pluginsMap.needsContext = true;
    } else {
      pluginsMap.withoutContext[name] = handler;
    }
  }

  return (ctx: PluginContext) => {
    if (!pluginsMap.needsContext) {
      return pluginsMap.withoutContext;
    }
    const pluginsWithContextApplied = {} as Record<
      string,
      (...args: any[]) => any
    >;
    for (const [name, handler] of Object.entries(pluginsMap.withContext)) {
      pluginsWithContextApplied[name] = handler(ctx);
    }

    return {
      ...pluginsMap.withoutContext,
      ...pluginsWithContextApplied
    };
  };
}

export default function getComponent(conf: Config, repository: Repository) {
  const client = Client({ templates: conf.templates });
  const cache = new Cache({
    verbose: !!conf.verbosity,
    refreshInterval: conf.refreshInterval
  });
  const convertPlugins = pluginConverter(conf.plugins);
  const customHeadersByConfig = new WeakMap<Config, Set<string> | undefined>();
  const pluginNamesByConfig = new WeakMap<Config, Set<string>>();
  const getCustomHeadersToSkip = (config: Config) => {
    if (!customHeadersByConfig.has(config)) {
      customHeadersByConfig.set(
        config,
        config.customHeadersToSkipOnWeakVersion?.length
          ? new Set(config.customHeadersToSkipOnWeakVersion)
          : undefined
      );
    }
    return customHeadersByConfig.get(config);
  };
  const getRegistryPluginNames = (config: Config) => {
    let names = pluginNamesByConfig.get(config);
    if (!names) {
      names = new Set(Object.keys(config.plugins || {}));
      pluginNamesByConfig.set(config, names);
    }
    return names;
  };
  const inFlight = new Map<string, Promise<unknown>>();

  const singleFlight = <T>(key: string, operation: () => Promise<T>) => {
    const pending = inFlight.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    const promise = operation().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, promise);
    return promise;
  };

  const getEnv = async (
    component: Component
  ): Promise<Record<string, string>> => {
    const cacheKey = `${component.name}/${component.version}/.env`;
    const cached = cache.get('file-contents', cacheKey);

    if (cached) return cached;

    return singleFlight(cacheKey, async () => {
      const env = component.oc.files.env
        ? await repository.getEnv(component.name, component.version)
        : {};
      cache.set('file-contents', cacheKey, env);
      return env;
    });
  };

  const renderer = async (
    options: RendererOptions,
    cb: (result: GetComponentResult) => void
  ) => {
    const nestedRenderer = NestedRenderer(renderer, options.conf);
    const retrievingInfo = GetComponentRetrievingInfo(options);
    let responseHeaders: Record<string, string> | undefined;
    const responseCookies: Array<{
      name: string;
      value: any;
      options?: CookieOptions;
    }> = [];

    const getLanguage = () => {
      const paramOverride =
        !!options.parameters && options.parameters['__ocAcceptLanguage'];
      return paramOverride || options.headers['accept-language'];
    };

    const callback = (result: GetComponentResult) => {
      if (responseCookies.length > 0 && !result.cookies) {
        result.cookies = responseCookies;
      }
      if (result.response.error) {
        retrievingInfo.extend(result.response);
      }

      retrievingInfo.extend({ status: result.status });

      Object.assign(result.response, {
        name: options.name,
        requestVersion: options.version || ''
      });

      eventsHandler.fire('component-retrieved', retrievingInfo.getData());
      return cb(result);
    };

    let componentCallbackDone = false;
    let callbackTimeout: ReturnType<typeof setTimeout> | undefined;
    const conf = options.conf;
    const requestedComponent = {
      name: options.name,
      version: options.version || '',
      parameters: options.parameters
    };

    fromPromise(repository.getComponent)(
      requestedComponent.name,
      requestedComponent.version,
      (err, component) => {
        // check route exist for component and version
        if (err) {
          if (conf.fallbackRegistryUrl) {
            return getComponentFallback.getComponent(
              conf.fallbackRegistryUrl,
              options.headers,
              requestedComponent,
              callback as any
            );
          }

          return callback({
            status: 404,
            response: {
              code: 'NOT_FOUND',
              error: err
            }
          });
        }

        // Skip rendering and return only the component info in case of 'accept: application/vnd.oc.info+json'
        if (options.headers.accept === settings.registry.acceptInfoHeader) {
          return callback({
            status: 200,
            response: {
              type: conf.local ? 'oc-component-local' : 'oc-component',
              version: component.version,
              requestVersion: requestedComponent.version,
              name: requestedComponent.name
            }
          });
        }

        // check component requirements are satisfied by registry
        const pluginsCompatibility = validator.validatePluginsRequirements(
          component.oc.plugins,
          getRegistryPluginNames(conf)
        );

        if (!pluginsCompatibility.isValid) {
          return callback({
            status: 501,
            response: {
              code: 'PLUGIN_MISSING_FROM_REGISTRY',
              error: strings.errors.registry.PLUGIN_NOT_IMPLEMENTED(
                pluginsCompatibility.missing.join(', ')
              ),
              missingPlugins: pluginsCompatibility.missing
            }
          });
        }

        // sanitise and check params
        const appliedParams = applyDefaultValues(
          requestedComponent.parameters,
          component.oc.parameters
        );
        const params = sanitiser.sanitiseComponentParameters(
          appliedParams,
          component.oc.parameters
        );
        const validationResult = validator.validateComponentParameters(
          params,
          component.oc.parameters
        );

        if (!options.action && !validationResult.isValid) {
          return callback({
            status: 400,
            response: {
              code: 'NOT_VALID_REQUEST',
              error: validationResult.errors.message
            }
          });
        }

        if (component.oc.files.template.minOcVersion) {
          const templateOcVersionResult = validateTemplateOcVersion(
            component.oc.files.template.minOcVersion
          );
          if (!templateOcVersionResult.isValid) {
            return callback({
              status: 400,
              response: {
                code: 'TEMPLATE_REQUIRES_HIGHER_OC_VERSION',
                error: strings.errors.cli.TEMPLATE_OC_VERSION_NOT_VALID(
                  templateOcVersionResult.error.minOcVersion,
                  templateOcVersionResult.error.registryVersion
                )
              }
            });
          }
        }

        // Support legacy templates
        let templateType = component.oc.files.template.type;
        const isLegacyTemplate = isTemplateLegacy(templateType);
        if (isLegacyTemplate) {
          templateType = `oc-template-${templateType}`;
        }

        const ocTemplate = repository.getTemplate(templateType);
        if (!ocTemplate) {
          return callback({
            status: 400,
            response: {
              code: 'TEMPLATE_NOT_SUPPORTED',
              error:
                strings.errors.registry.TEMPLATE_NOT_SUPPORTED(templateType)
            }
          });
        }

        const filterCustomHeaders = (
          headers: Record<string, string> | undefined,
          requestedVersion: string,
          actualVersion: string
        ) => {
          const customHeadersToSkipSet = getCustomHeadersToSkip(conf);
          if (
            !headers ||
            !customHeadersToSkipSet ||
            requestedVersion === actualVersion
          ) {
            return headers;
          }

          let filteredHeaders: Record<string, string> | undefined;
          for (const key in headers) {
            if (!customHeadersToSkipSet.has(key)) {
              filteredHeaders = filteredHeaders || {};
              filteredHeaders[key] = headers[key]!;
            }
          }

          return filteredHeaders;
        };

        const returnComponent = async (err: any, data: any) => {
          if (componentCallbackDone) {
            return;
          }
          componentCallbackDone = true;
          if (callbackTimeout) {
            clearTimeout(callbackTimeout);
            callbackTimeout = undefined;
          }

          const componentHref = urlBuilder.component(
            {
              name: component.name,
              version: requestedComponent.version,
              parameters: params as Record<string, string>
            },
            conf.baseUrl
          );

          const isUnrendered =
            options.headers.accept === settings.registry.acceptUnrenderedHeader;

          const isValidClientRequest = String(
            options.headers['user-agent'] || ''
          ).includes('oc-client-');
          const templatesHeader = options.headers['templates'];
          let isTemplateSupportedByClient = false;
          if (isUnrendered && isValidClientRequest && templatesHeader) {
            const supportedTemplates = parseTemplatesHeader(
              templatesHeader as string
            );
            isTemplateSupportedByClient =
              supportedTemplates.includes(component.oc.files.template.type) ||
              supportedTemplates.includes(templateType);
          }

          let renderMode = options.action ? 'unrendered' : 'rendered';
          if (isUnrendered) {
            renderMode = 'unrendered';
            if (
              isValidClientRequest &&
              !isTemplateSupportedByClient &&
              !isLegacyTemplate
            ) {
              renderMode = 'rendered';
            }
          }

          retrievingInfo.extend({
            href: componentHref,
            version: component.version,
            renderMode
          });

          if (err || !data) {
            err =
              err ||
              new Error(strings.errors.registry.DATA_OBJECT_IS_UNDEFINED);
            const status = Number(err.status) || 500;

            eventsHandler.fire('data-provider-error', {
              status,
              name: component.name,
              requestVersion: requestedComponent.version,
              parameters: params,
              version: component.version,
              error: err
            });

            const response = {
              status,
              response: {
                code: 'GENERIC_ERROR',
                error: strings.errors.registry.COMPONENT_EXECUTION_ERROR(
                  err.message || ''
                ),
                details: {
                  message: err.message,
                  stack: err.stack,
                  originalError: err,
                  frame: undefined as string | undefined
                }
              }
            };

            if (conf.local && err.stack) {
              const { content } = await repository
                .getDataProvider(component.name, component.version)
                .catch(() => ({ content: null }));
              if (content) {
                const processedStack = await processStackTrace({
                  stackTrace: err.stack,
                  code: content
                }).catch(() => null);
                if (processedStack) {
                  response.response.details.stack = processedStack.stack;
                  response.response.details.frame = processedStack.frame;

                  console.log(
                    `Error rendering component ${component.name} ${component.version}`
                  );
                  console.log(processedStack.stack);
                  console.log(processedStack.frame);
                }
              }
            }

            return callback(response);
          }

          const response: {
            baseUrl: string;
            type: string;
            version: string;
            requestVersion: string;
            name: string;
            renderMode: string;
            href?: string;
          } = {
            baseUrl: conf.baseUrl,
            type: conf.local ? 'oc-component-local' : 'oc-component',
            version: component.version,
            requestVersion: requestedComponent.version,
            name: requestedComponent.name,
            renderMode
          };

          if (!options.omitHref) {
            response.href = componentHref;
          }

          responseHeaders = filterCustomHeaders(
            responseHeaders,
            requestedComponent.version,
            component.version
          );

          if (renderMode === 'unrendered') {
            callback({
              status: 200,
              ...(responseHeaders ? { headers: responseHeaders } : {}),
              response: Object.assign(response, {
                data: data,
                template: {
                  src: repository.getStaticFilePath(
                    component.name,
                    component.version,
                    'template.js'
                  ),
                  type: component.oc.files.template.type,
                  key: component.oc.files.template.hashKey
                }
              })
            });
          } else {
            const cacheKey = `${component.name}/${component.version}/template.js`;
            const cached = cache.get('file-contents', cacheKey);
            const key = component.oc.files.template.hashKey;
            const id = randomUUID();
            const renderOptions = {
              href: componentHref,
              key,
              version: component.version,
              name: component.name,
              templateType: component.oc.files.template.type,
              container: component.oc.container,
              renderInfo: component.oc.renderInfo,
              id
            };
            data.id = id;

            const returnResult = (template: any) => {
              client.renderTemplate(
                template,
                data,
                renderOptions,
                (err: Error, html: string) => {
                  if (err) {
                    return callback({
                      status: 500,
                      response: {
                        code: 'INTERNAL_SERVER_ERROR',
                        error: err
                      }
                    });
                  }

                  callback({
                    status: 200,
                    ...(responseHeaders ? { headers: responseHeaders } : {}),
                    response: Object.assign(response, { html })
                  });
                }
              );
            };

            if (cached && !conf.hotReloading) {
              returnResult(cached);
            } else {
              const loadTemplate = async () => {
                const templateText = await repository.getCompiledView(
                  component.name,
                  component.version
                );
                const template = ocTemplate.getCompiledTemplate(
                  templateText,
                  key
                );
                cache.set('file-contents', cacheKey, template);
                return template;
              };
              const templatePromise = conf.hotReloading
                ? loadTemplate()
                : singleFlight(cacheKey, loadTemplate);
              templatePromise.then(returnResult).catch((error) =>
                callback({
                  status: 500,
                  response: {
                    code: 'INTERNAL_SERVER_ERROR',
                    error
                  }
                })
              );
            }
          }
        };
        const staticPath = repository
          .getStaticFilePath(component.name, component.version, '')
          .replace(/^https:/, '');

        if (!component.oc.files.dataProvider) {
          const { __oc_Retry, ...props } = params;
          props['_staticPath'] = staticPath;
          props['_baseUrl'] = conf.baseUrl;
          props['_componentName'] = component.name;
          props['_componentVersion'] = component.version;

          returnComponent(null, { component: { props } });
        } else {
          fromPromise(getEnv)(component, (err, env) => {
            if (err) {
              componentCallbackDone = true;

              return callback({
                status: 502,
                response: {
                  code: 'ENV_RESOLVING_ERROR',
                  error: strings.errors.registry.RESOLVING_ERROR
                }
              });
            }

            const cacheKey = `${component.name}/${component.version}/server.js`;
            const cached = cache.get('file-contents', cacheKey);
            const domain = Domain.create();
            const setEmptyResponse =
              emptyResponseHandler.contextDecorator(returnComponent);
            let parsedAcceptLanguage:
              | ReturnType<typeof acceptLanguageParser.parse>
              | undefined;
            const contextObj = {
              action: options.action,
              get acceptLanguage() {
                parsedAcceptLanguage ??= acceptLanguageParser.parse(
                  getLanguage()!
                );
                return parsedAcceptLanguage;
              },
              baseUrl: conf.baseUrl,
              env: { ...conf.env, ...env },
              params,
              plugins: convertPlugins({
                name: component.name,
                version: component.version
              }),
              renderComponent: fromPromise(nestedRenderer.renderComponent),
              renderComponents: fromPromise(nestedRenderer.renderComponents),
              requestHeaders: options.headers,
              requestIp: options.ip,
              setEmptyResponse,
              staticPath,
              setHeader: (header?: string, value?: string) => {
                if (
                  !(typeof header === 'string' && typeof value === 'string')
                ) {
                  throw strings.errors.registry
                    .COMPONENT_SET_HEADER_PARAMETERS_NOT_VALID;
                }

                if (header && value) {
                  responseHeaders = responseHeaders || {};
                  responseHeaders[header.toLowerCase()] = value;
                }
              },
              setCookie: (
                name?: string,
                value?: any,
                options?: CookieOptions
              ) => {
                if (typeof name !== 'string') {
                  throw strings.errors.registry
                    .COMPONENT_SET_COOKIE_PARAMETERS_NOT_VALID;
                }
                responseCookies.push({ name, value, options });
              },
              templates: repository.getTemplatesInfo(),
              streamSymbol: stream
            };

            const setCallbackTimeout = () => {
              const executionTimeout = conf.executionTimeout;
              if (executionTimeout) {
                callbackTimeout = setTimeout(() => {
                  const message = `timeout (${executionTimeout * 1000}ms)`;
                  returnComponent({ message }, undefined);
                  domain.exit();
                }, executionTimeout * 1000);
              }
            };

            if (cached && !conf.hotReloading) {
              domain.on('error', returnComponent);

              try {
                domain.run(() => {
                  setCallbackTimeout();
                  cached(contextObj, returnComponent);
                });
              } catch (e) {
                return returnComponent(e, undefined);
              }
            } else {
              const handleError = (err: {
                code: string;
                missing: string[];
              }) => {
                if (err.code === 'DATA_RESOLVING_ERROR') {
                  componentCallbackDone = true;
                  return callback({
                    status: 502,
                    response: {
                      code: err.code,
                      error: strings.errors.registry.RESOLVING_ERROR
                    }
                  });
                }

                if (err.code === 'DEPENDENCY_MISSING_FROM_REGISTRY') {
                  componentCallbackDone = true;
                  return callback({
                    status: 501,
                    response: {
                      code: err.code,
                      error: strings.errors.registry.DEPENDENCY_NOT_FOUND(
                        err.missing.join(', ')
                      ),
                      missingDependencies: err.missing
                    }
                  });
                }

                returnComponent(err, undefined);
              };

              const loadDataProvider = async () => {
                const dataProvider = await repository
                  .getDataProvider(component.name, component.version)
                  .catch(() => {
                    throw { code: 'DATA_RESOLVING_ERROR', missing: [] };
                  });
                const context = {
                  require: RequireWrapper(conf.dependencies),
                  module: {
                    exports: {} as Record<string, (...args: any[]) => any>
                  },
                  exports: {} as Record<string, (...args: any[]) => any>,
                  console: conf.local ? console : noopConsole,
                  setTimeout,
                  Buffer,
                  Error,
                  AbortController: globalThis?.AbortController,
                  AbortSignal: globalThis?.AbortSignal,
                  Promise,
                  Date,
                  Symbol,
                  eval: undefined,
                  URL: globalThis?.URL,
                  URLSearchParams: globalThis?.URLSearchParams,
                  crypto: globalThis?.crypto,
                  fetch: globalThis?.fetch,
                  process: {
                    env: {
                      NODE_ENV: conf.local ? 'development' : 'production',
                      ...conf.env,
                      ...env
                    }
                  }
                };
                const vmOptions = conf.local
                  ? {
                      displayErrors: true,
                      filename: dataProvider.filePath
                    }
                  : {};

                vm.runInNewContext(dataProvider.content, context, vmOptions);
                const processData =
                  context.module.exports['data'] || context.exports['data'];
                cache.set('file-contents', cacheKey, processData);
                return processData;
              };

              const dataProviderPromise = conf.hotReloading
                ? loadDataProvider()
                : singleFlight(cacheKey, loadDataProvider);
              dataProviderPromise
                .then((processData) => {
                  domain.on('error', handleError);
                  domain.run(() => {
                    setCallbackTimeout();
                    processData(contextObj, returnComponent);
                  });
                })
                .catch(handleError);
            }
          });
        }
      }
    );
  };

  return renderer;
}
