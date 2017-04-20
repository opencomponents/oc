'use strict';

const acceptLanguageParser = require('accept-language-parser');
const Cache = require('nice-cache');
const Domain = require('domain');
const format = require('stringformat');
const vm = require('vm');
const _ = require('lodash');

const applyDefaultValues = require('./apply-default-values');
const Client = require('../../../../client');
const detective = require('../../domain/plugins-detective');
const eventsHandler = require('../../domain/events-handler');
const GetComponentRetrievingInfo = require('./get-component-retrieving-info');
const getComponentFallback = require('./get-component-fallback');
const NestedRenderer = require('../../domain/nested-renderer');
const RequireWrapper = require('../../domain/require-wrapper');
const sanitiser = require('../../domain/sanitiser');
const settings = require('../../../resources/settings');
const strings = require('../../../resources');
const urlBuilder = require('../../domain/url-builder');
const validator = require('../../domain/validators');
const requireTemplate = require('../../../utils/require-template');

module.exports = function(conf, repository){
  const client = new Client(),
    cache = new Cache({
      verbose: !!conf.verbosity,
      refreshInterval: conf.refreshInterval
    });

  const renderer = function(options, cb){
    const nestedRenderer = new NestedRenderer(renderer, options.conf),
      retrievingInfo = new GetComponentRetrievingInfo(options);
    let responseHeaders = {};

    const getLanguage = function(){
      const paramOverride = !!options.parameters && options.parameters['__ocAcceptLanguage'];
      return paramOverride || options.headers['accept-language'];
    };

    const callback = function(result){
      if(result.response.error){
        retrievingInfo.extend(result.response);
      }

      _.extend(result.response, {
        name: options.name,
        requestVersion: options.version || ''
      });

      eventsHandler.fire('component-retrieved', retrievingInfo.getData());
      return cb(result);
    };

    let componentCallbackDone = false;
    const conf = options.conf,
      acceptLanguage = getLanguage(),
      requestedComponent = {
        name: options.name,
        version: options.version || '',
        parameters: options.parameters
      };

    repository.getComponent(requestedComponent.name, requestedComponent.version, (err, component) => {

      // check route exist for component and version
      if(err){
        if(conf.fallbackRegistryUrl) {
          return getComponentFallback.getComponent(conf.fallbackRegistryUrl, options.headers, requestedComponent, callback);
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
            name: requestedComponent.name,
          }
        });
      }

      // check component requirements are satisfied by registry
      const pluginsCompatibility = validator.validatePluginsRequirements(component.oc.plugins, conf.plugins);

      if(!pluginsCompatibility.isValid){
        return callback({
          status: 501,
          response: {
            code: 'PLUGIN_MISSING_FROM_REGISTRY',
            error: format(strings.errors.registry.PLUGIN_NOT_IMPLEMENTED, pluginsCompatibility.missing.join(', ')),
            missingPlugins: pluginsCompatibility.missing
          }
        });
      }

      // sanitise and check params
      const appliedParams = applyDefaultValues(requestedComponent.parameters, component.oc.parameters),
        params = sanitiser.sanitiseComponentParameters(appliedParams, component.oc.parameters),
        validationResult = validator.validateComponentParameters(params, component.oc.parameters);

      if(!validationResult.isValid){
        return callback({
          status: 400,
          response: {
            code: 'NOT_VALID_REQUEST',
            error: validationResult.errors.message
          }
        });
      }

      const filterCustomHeaders = function(headers, requestedVersion, actualVersion) {

        const needFiltering = !_.isEmpty(headers) &&
          !_.isEmpty(conf.customHeadersToSkipOnWeakVersion) &&
          requestedVersion !== actualVersion;

        return needFiltering ? _.omit(headers, conf.customHeadersToSkipOnWeakVersion) : headers;
      };

      const returnComponent = function(err, data){

        if(componentCallbackDone){ return; }
        componentCallbackDone = true;

        if(!!err || !data){
          err = err || new Error(strings.errors.registry.DATA_OBJECT_IS_UNDEFINED);
          return callback({
            status: 500,
            response: {
              code: 'GENERIC_ERROR',
              error: format(strings.errors.registry.COMPONENT_EXECUTION_ERROR, err.message || ''),
              details: { message: err.message, stack: err.stack, originalError: err }
            }
          });
        }

        const componentHref = urlBuilder.component({
          name: component.name,
          version: requestedComponent.version,
          parameters: params
        }, conf.baseUrl);

        const isUnrendered = options.headers.accept === settings.registry.acceptUnrenderedHeader,
          renderMode = isUnrendered ? 'unrendered' : 'rendered';

        const response = {
          type: conf.local ? 'oc-component-local' : 'oc-component',
          version: component.version,
          requestVersion: requestedComponent.version,
          name: requestedComponent.name,
          renderMode: renderMode
        };

        if(!options.omitHref){
          response.href = componentHref;
        }

        retrievingInfo.extend({
          href: componentHref,
          version: component.version,
          renderMode: renderMode
        });

        responseHeaders = filterCustomHeaders(responseHeaders, requestedComponent.version, component.version);

        if (isUnrendered) {
          callback({
            status: 200,
            headers: responseHeaders,
            response: _.extend(response, {
              data: data,
              template: {
                src: repository.getStaticFilePath(component.name, component.version, 'template.js'),
                type: component.oc.files.template.type,
                key: component.oc.files.template.hashKey
              }
            })
          });
        } else {

          const cacheKey = format('{0}/{1}/template.js', component.name, component.version),
            cached = cache.get('file-contents', cacheKey),
            key = component.oc.files.template.hashKey,
            renderOptions = {
              href: componentHref,
              key: key,
              version: component.version,
              name: component.name,
              templateType: component.oc.files.template.type,
              container: component.oc.container,
              renderInfo: component.oc.renderInfo
            };

          const returnResult = function(template){
            client.renderTemplate(template, data, renderOptions, (err, html) => {

              if(err){
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
                response: _.extend(response, { html: html })
              });
            });
          };

          if(!!cached && !conf.hotReloading){
            returnResult(cached);
          } else {
            repository.getCompiledView(component.name, component.version, (err, templateText) => {
              let ocTemplate;
              let type = component.oc.files.template.type;
              if (type === 'jade') { type = 'oc-template-jade'; }
              if (type === 'handlebars') { type = 'oc-template-handlebars'; }

              try {
                ocTemplate = requireTemplate(type);
              } catch (err) {
                throw err;
              }

              const template = ocTemplate.getCompiledTemplate(templateText, key);
              cache.set('file-contents', cacheKey, template);
              returnResult(template);
            });
          }
        }
      };

      if(!component.oc.files.dataProvider){
        returnComponent(null, {});
      } else {

        const cacheKey = format('{0}/{1}/server.js', component.name, component.version),
          cached = cache.get('file-contents', cacheKey),
          domain = Domain.create(),
          contextObj = {
            acceptLanguage: acceptLanguageParser.parse(acceptLanguage),
            baseUrl: conf.baseUrl,
            env: conf.env,
            params: params,
            plugins: conf.plugins,
            renderComponent: nestedRenderer.renderComponent,
            renderComponents: nestedRenderer.renderComponents,
            requestHeaders: options.headers,
            staticPath: repository.getStaticFilePath(component.name, component.version, '').replace('https:', ''),
            setHeader: function(header, value) {
              if (!(typeof(header) === 'string' && typeof(value) === 'string')) {
                throw strings.errors.registry.COMPONENT_SET_HEADER_PARAMETERS_NOT_VALID;
              }

              if (header && value) {
                responseHeaders = responseHeaders || {};
                responseHeaders[header.toLowerCase()] = value;
              }
            },
            templates: repository.getTemplates()
          };

        const setCallbackTimeout = function(){
          if(conf.executionTimeout){
            setTimeout(() => {
              returnComponent({
                message: format('timeout ({0}ms)', conf.executionTimeout * 1000)
              });
              domain.exit();
            }, conf.executionTimeout * 1000);
          }
        };

        if(!!cached && !conf.hotReloading){
          domain.on('error', returnComponent);

          try {
            domain.run(() => {
              cached(contextObj, returnComponent);
              setCallbackTimeout();
            });
          } catch(e){
            return returnComponent(e);
          }
        } else {
          repository.getDataProvider(component.name, component.version, (err, dataProcessorJs) => {

            if(err){
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
              require: new RequireWrapper(conf.dependencies),
              module: { exports: {}},
              console: conf.local ? console : { log: _.noop },
              setTimeout: setTimeout,
              Buffer: Buffer
            };

            const handleError = function(err){

              if(err.code === 'DEPENDENCY_MISSING_FROM_REGISTRY'){
                componentCallbackDone = true;

                return callback({
                  status: 501,
                  response: {
                    code: err.code,
                    error: format(strings.errors.registry.DEPENDENCY_NOT_FOUND, err.missing.join(', ')),
                    missingDependencies: err.missing
                  }
                });
              }

              const usedPlugins = detective.parse(dataProcessorJs),
                unRegisteredPlugins = _.difference(usedPlugins, _.keys(conf.plugins));

              if(!_.isEmpty(unRegisteredPlugins)){
                componentCallbackDone = true;

                return callback({
                  status: 501,
                  response: {
                    code: 'PLUGIN_MISSING_FROM_COMPONENT',
                    error: format(strings.errors.registry.PLUGIN_NOT_FOUND, unRegisteredPlugins.join(' ,')),
                    missingPlugins: unRegisteredPlugins
                  }
                });
              }

              returnComponent(err);
            };

            try {
              vm.runInNewContext(dataProcessorJs, context);
              const processData = context.module.exports.data;
              cache.set('file-contents', cacheKey, processData);

              domain.on('error', handleError);
              domain.run(() => {
                processData(contextObj, returnComponent);
                setCallbackTimeout();
              });
            } catch(err){
              handleError(err);
            }
          });
        }
      }
    });
  };

  return renderer;
};
