'use strict';

var acceptLanguageParser = require('accept-language-parser');
var Cache = require('nice-cache');
var Domain = require('domain');
var format = require('stringformat');
var vm = require('vm');
var _ = require('underscore');

var applyDefaultValues = require('./apply-default-values');
var Client = require('../../../../client');
var detective = require('../../domain/plugins-detective');
var eventsHandler = require('../../domain/events-handler');
var GetComponentRetrievingInfo = require('./get-component-retrieving-info');
var getComponentFallback = require('./get-component-fallback');
var NestedRenderer = require('../../domain/nested-renderer');
var RequireWrapper = require('../../domain/require-wrapper');
var sanitiser = require('../../domain/sanitiser');
var settings = require('../../../resources/settings');
var strings = require('../../../resources');
var urlBuilder = require('../../domain/url-builder');
var validator = require('../../domain/validators');
var handlebars = require('oc-template-handlebars');
var jade = require('oc-template-jade');

var templateEngines = {
  handlebars,
  jade
};

module.exports = function(conf, repository){

  var client = new Client(),
      cache = new Cache({
        verbose: !!conf.verbosity,
        refreshInterval: conf.refreshInterval
      });

  var renderer = function(options, cb){

    var nestedRenderer = new NestedRenderer(renderer, options.conf),
        retrievingInfo = new GetComponentRetrievingInfo(options),
        responseHeaders = {};

    var getLanguage = function(){
      var paramOverride = !!options.parameters && options.parameters['__ocAcceptLanguage'];
      return paramOverride || options.headers['accept-language'];
    };

    var callback = function(result){

      if(!!result.response.error){
        retrievingInfo.extend(result.response);
      }

      _.extend(result.response, {
        name: options.name,
        requestVersion: options.version || ''
      });

      eventsHandler.fire('component-retrieved', retrievingInfo.getData());
      return cb(result);
    };

    var conf = options.conf,
        acceptLanguage = getLanguage(),
        componentCallbackDone = false,
        requestedComponent = {
          name: options.name,
          version: options.version || '',
          parameters: options.parameters
        };

    repository.getComponent(requestedComponent.name, requestedComponent.version, function(err, component){

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
      var pluginsCompatibility = validator.validatePluginsRequirements(component.oc.plugins, conf.plugins);

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
      var appliedParams = applyDefaultValues(requestedComponent.parameters, component.oc.parameters),
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

      var filterCustomHeaders = function(headers, requestedVersion, actualVersion) {

        var needFiltering = !_.isEmpty(headers) &&
          !_.isEmpty(conf.customHeadersToSkipOnWeakVersion) &&
          requestedVersion !== actualVersion;

        return needFiltering ? _.omit(headers, conf.customHeadersToSkipOnWeakVersion) : headers;
      };

      var returnComponent = function(err, data){

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

        var componentHref = urlBuilder.component({
          name: component.name,
          version: requestedComponent.version,
          parameters: params
        }, conf.baseUrl);

        var isUnrendered = options.headers.accept === settings.registry.acceptUnrenderedHeader,
            renderMode = isUnrendered ? 'unrendered' : 'rendered';

        var response = {
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

          var cacheKey = format('{0}/{1}/template.js', component.name, component.version),
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

          var returnResult = function(template){
            client.renderTemplate(template, data, renderOptions, function(err, html){

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
            repository.getCompiledView(component.name, component.version, function(err, templateText){

              var type = component.oc.files.template.type;
              if (!templateEngines[type]) {
                throw strings.errors.cli.TEMPLATE_TYPE_NOT_VALID;
              }

              var template = templateEngines[type].getCompiledTemplate(templateText, key);
              cache.set('file-contents', cacheKey, template);
              returnResult(template);
            });
          }
        }
      };

      if(!component.oc.files.dataProvider){
        returnComponent(null, {});
      } else {

        var cacheKey = format('{0}/{1}/server.js', component.name, component.version),
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
              }
            };

        var setCallbackTimeout = function(){
          if(!!conf.executionTimeout){
            setTimeout(function(){
              returnComponent({
                message: format('timeout ({0}ms)', conf.executionTimeout * 1000)
              });
            }, conf.executionTimeout * 1000);
          }
        };

        if(!!cached && !conf.hotReloading){
          domain.on('error', returnComponent);

          try {
            domain.run(function(){
              cached(contextObj, returnComponent);
              setCallbackTimeout();
            });
          } catch(e){
            return returnComponent(e);
          }
        } else {
          repository.getDataProvider(component.name, component.version, function(err, dataProcessorJs){

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

            var context = {
              require: new RequireWrapper(conf.dependencies),
              module: { exports: {}},
              console: conf.local ? console : { log: _.noop },
              setTimeout: setTimeout,
              Buffer: Buffer
            };

            var handleError = function(err){

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

              var usedPlugins = detective.parse(dataProcessorJs),
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
              var processData = context.module.exports.data;
              cache.set('file-contents', cacheKey, processData);

              domain.on('error', handleError);
              domain.run(function(){
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
