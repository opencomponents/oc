'use strict';

const acceptLanguageParser = require('accept-language-parser');
const Cache = require('nice-cache');
const Client = require('oc-client');
const Domain = require('domain');
const format = require('stringformat');
const emptyResponseHandler = require('oc-empty-response-handler');
const vm = require('vm');
const _ = require('lodash');

const applyDefaultValues = require('./apply-default-values');
const eventsHandler = require('../../domain/events-handler');
const GetComponentRetrievingInfo = require('./get-component-retrieving-info');
const getComponentFallback = require('./get-component-fallback');
const isTemplateLegacy = require('../../../utils/is-template-legacy');
const NestedRenderer = require('../../domain/nested-renderer');
const RequireWrapper = require('../../domain/require-wrapper');
const sanitiser = require('../../domain/sanitiser');
const settings = require('../../../resources/settings');
const strings = require('../../../resources');
const urlBuilder = require('../../domain/url-builder');
const validator = require('../../domain/validators');

module.exports = function(conf, repository) {
  const client = new Client({ templates: conf.templates }),
    cache = new Cache({
      verbose: !!conf.verbosity,
      refreshInterval: conf.refreshInterval
    });

  const renderer = function(options, cb) {
    const nestedRenderer = new NestedRenderer(renderer, options.conf),
      retrievingInfo = new GetComponentRetrievingInfo(options);
    let responseHeaders = {};

    const getLanguage = () => {
      const paramOverride =
        !!options.parameters && options.parameters['__ocAcceptLanguage'];
      return paramOverride || options.headers['accept-language'];
    };

    const callback = result => {
      if (result.response.error) {
        retrievingInfo.extend(result.response);
      }

      retrievingInfo.extend({ status: result.status });

      _.extend(result.response, {
        name: options.name,
        requestVersion: options.version || ''
      });

      eventsHandler.fire('component-retrieved', retrievingInfo.getData());
      return cb(result);
    };

    let componentCallbackDone = false;
    const conf = options.conf;
    const acceptLanguage = getLanguage();
    const requestedComponent = {
      name: options.name,
      version: options.version || '',
      parameters: options.parameters
    };

    repository.getComponent(
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
              callback
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
          conf.plugins
        );

        if (!pluginsCompatibility.isValid) {
          return callback({
            status: 501,
            response: {
              code: 'PLUGIN_MISSING_FROM_REGISTRY',
              error: format(
                strings.errors.registry.PLUGIN_NOT_IMPLEMENTED,
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
          ),
          params = sanitiser.sanitiseComponentParameters(
            appliedParams,
            component.oc.parameters
          ),
          validationResult = validator.validateComponentParameters(
            params,
            component.oc.parameters
          );

        if (!validationResult.isValid) {
          return callback({
            status: 400,
            response: {
              code: 'NOT_VALID_REQUEST',
              error: validationResult.errors.message
            }
          });
        }

        // Support legacy templates
        let templateType = component.oc.files.template.type;
        const isLegacyTemplate = isTemplateLegacy(templateType);
        if (isLegacyTemplate) {
          templateType = `oc-template-${templateType}`;
        }

        if (!repository.getTemplate(templateType)) {
          return callback({
            status: 400,
            response: {
              code: 'TEMPLATE_NOT_SUPPORTED',
              error: format(
                strings.errors.registry.TEMPLATE_NOT_SUPPORTED,
                templateType
              )
            }
          });
        }

        const filterCustomHeaders = (
          headers,
          requestedVersion,
          actualVersion
        ) => {
          const needFiltering =
            !_.isEmpty(headers) &&
            !_.isEmpty(conf.customHeadersToSkipOnWeakVersion) &&
            requestedVersion !== actualVersion;

          return needFiltering
            ? _.omit(headers, conf.customHeadersToSkipOnWeakVersion)
            : headers;
        };

        const returnComponent = (err, data) => {
          if (componentCallbackDone) {
            return;
          }
          componentCallbackDone = true;

          const componentHref = urlBuilder.component(
            {
              name: component.name,
              version: requestedComponent.version,
              parameters: params
            },
            conf.baseUrl
          );

          const isUnrendered =
            options.headers.accept === settings.registry.acceptUnrenderedHeader;

          const isValidClientRequest =
            options.headers['user-agent'] &&
            !!options.headers['user-agent'].match('oc-client-');

          const parseTemplatesHeader = t =>
            t.split(';').map(t => t.split(',')[0]);
          const supportedTemplates = options.headers.templates
            ? parseTemplatesHeader(options.headers.templates)
            : [];

          const isTemplateSupportedByClient = Boolean(
            isValidClientRequest &&
              options.headers.templates &&
              (_.includes(
                supportedTemplates,
                component.oc.files.template.type
              ) ||
                _.includes(supportedTemplates, templateType))
          );

          let renderMode = 'rendered';
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

          if (!!err || !data) {
            err =
              err ||
              new Error(strings.errors.registry.DATA_OBJECT_IS_UNDEFINED);
            return callback({
              status: 500,
              response: {
                code: 'GENERIC_ERROR',
                error: format(
                  strings.errors.registry.COMPONENT_EXECUTION_ERROR,
                  err.message || ''
                ),
                details: {
                  message: err.message,
                  stack: err.stack,
                  originalError: err
                }
              }
            });
          }

          const response = {
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
              headers: responseHeaders,
              response: _.extend(response, {
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
            const cacheKey = `${component.name}/${
              component.version
            }/template.js`;
            const cached = cache.get('file-contents', cacheKey);
            const key = component.oc.files.template.hashKey;
            const renderOptions = {
              href: componentHref,
              key,
              version: component.version,
              name: component.name,
              templateType: component.oc.files.template.type,
              container: component.oc.container,
              renderInfo: component.oc.renderInfo
            };

            const returnResult = template => {
              client.renderTemplate(
                template,
                data,
                renderOptions,
                (err, html) => {
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
                    headers: responseHeaders,
                    response: _.extend(response, { html })
                  });
                }
              );
            };

            if (!!cached && !conf.hotReloading) {
              returnResult(cached);
            } else {
              repository.getCompiledView(
                component.name,
                component.version,
                (err, templateText) => {
                  let ocTemplate;

                  try {
                    ocTemplate = repository.getTemplate(templateType);
                  } catch (err) {
                    throw err;
                  }

                  const template = ocTemplate.getCompiledTemplate(
                    templateText,
                    key
                  );
                  cache.set('file-contents', cacheKey, template);
                  returnResult(template);
                }
              );
            }
          }
        };

        if (!component.oc.files.dataProvider) {
          returnComponent(null, {});
        } else {
          const cacheKey = `${component.name}/${component.version}/server.js`;
          const cached = cache.get('file-contents', cacheKey);
          const domain = Domain.create();
          const setEmptyResponse = emptyResponseHandler.contextDecorator(
            returnComponent
          );
          const contextObj = {
            acceptLanguage: acceptLanguageParser.parse(acceptLanguage),
            baseUrl: conf.baseUrl,
            env: conf.env,
            params,
            plugins: conf.plugins,
            renderComponent: nestedRenderer.renderComponent,
            renderComponents: nestedRenderer.renderComponents,
            requestHeaders: options.headers,
            setEmptyResponse,
            staticPath: repository
              .getStaticFilePath(component.name, component.version, '')
              .replace('https:', ''),
            setHeader: (header, value) => {
              if (!(typeof header === 'string' && typeof value === 'string')) {
                throw strings.errors.registry
                  .COMPONENT_SET_HEADER_PARAMETERS_NOT_VALID;
              }

              if (header && value) {
                responseHeaders = responseHeaders || {};
                responseHeaders[header.toLowerCase()] = value;
              }
            },
            templates: repository.getTemplatesInfo()
          };

          const setCallbackTimeout = () => {
            if (conf.executionTimeout) {
              setTimeout(() => {
                const message = `timeout (${conf.executionTimeout * 1000}ms)`;
                returnComponent({ message });
                domain.exit();
              }, conf.executionTimeout * 1000);
            }
          };

          if (!!cached && !conf.hotReloading) {
            domain.on('error', returnComponent);

            try {
              domain.run(() => {
                cached(contextObj, returnComponent);
                setCallbackTimeout();
              });
            } catch (e) {
              return returnComponent(e);
            }
          } else {
            repository.getDataProvider(
              component.name,
              component.version,
              (err, dataProvider) => {
                if (err) {
                  componentCallbackDone = true;

                  return callback({
                    status: 502,
                    response: {
                      code: 'DATA_RESOLVING_ERROR',
                      error: strings.errors.registry.RESOLVING_ERROR
                    }
                  });
                }

                const context = {
                  require: RequireWrapper(conf.dependencies),
                  module: { exports: {} },
                  console: conf.local ? console : { log: _.noop },
                  setTimeout,
                  Buffer
                };

                const handleError = err => {
                  if (err.code === 'DEPENDENCY_MISSING_FROM_REGISTRY') {
                    componentCallbackDone = true;

                    return callback({
                      status: 501,
                      response: {
                        code: err.code,
                        error: format(
                          strings.errors.registry.DEPENDENCY_NOT_FOUND,
                          err.missing.join(', ')
                        ),
                        missingDependencies: err.missing
                      }
                    });
                  }

                  returnComponent(err);
                };

                const options = conf.local
                  ? {
                    displayErrors: true,
                    filename: dataProvider.filePath
                  }
                  : {};

                try {
                  vm.runInNewContext(dataProvider.content, context, options);
                  const processData = context.module.exports.data;
                  cache.set('file-contents', cacheKey, processData);

                  domain.on('error', handleError);
                  domain.run(() => {
                    processData(contextObj, returnComponent);
                    setCallbackTimeout();
                  });
                } catch (err) {
                  handleError(err);
                }
              }
            );
          }
        }
      }
    );
  };

  return renderer;
};
