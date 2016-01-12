'use strict';

var acceptLanguageParser = require('accept-language-parser');
var Cache = require('nice-cache');
var Domain = require('domain');
var format = require('stringformat');
var vm = require('vm');
var _ = require('underscore');

var Client = require('../../../client');
var detective = require('../../domain/plugins-detective');
var GetComponentRetrievingInfo = require('./get-component-retrieving-info');
var RequireWrapper = require('../../domain/require-wrapper');
var sanitiser = require('../../domain/sanitiser');
var strings = require('../../../resources');
var urlBuilder = require('../../domain/url-builder');
var validator = require('../../domain/validators');

module.exports = function(conf, repository){

  var client = new Client(conf),
      cache = new Cache({
        verbose: !!conf.verbosity,
        refreshInterval: conf.refreshInterval
      });

  return function(options, cb){

    var retrievingInfo = new GetComponentRetrievingInfo(options);

    var callback = function(result){

      if(!!result.response.error){
        retrievingInfo.extend(result.response);
      }

      options.eventsHandler.fire('component-retrieved', retrievingInfo.getData());
      return cb(result);
    };
    
    var conf = options.conf,
        componentCallbackDone = false,
        requestedComponent = {
          name: options.name,
          version: options.version || '',
          parameters: options.parameters
        };

    repository.getComponent(requestedComponent.name, requestedComponent.version, function(err, component){

      // check route exist for component and version
      if(err){
        return callback({
          status: 404,
          response: {
            code: 'NOT_FOUND',
            error: err
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
      var params = sanitiser.sanitiseComponentParameters(requestedComponent.parameters, component.oc.parameters),
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

      var returnComponent = function(err, data){

        if(componentCallbackDone){ return; }
        componentCallbackDone = true;

        if(!!err){
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

        var acceptH = options.headers.accept,
            isUnrendered = acceptH === 'application/vnd.oc.prerendered+json' ||
              acceptH === 'application/vnd.oc.unrendered+json',
            renderMode = isUnrendered ? 'unrendered' : 'rendered';

        var response = {
          href: componentHref,
          type: conf.local ? 'oc-component-local' : 'oc-component',
          version: component.version,
          requestVersion: requestedComponent.version,
          name: requestedComponent.name,
          renderMode: renderMode
        };

        retrievingInfo.extend({
          href: componentHref,
          version: component.version,
          renderMode: renderMode
        });

        if(isUnrendered){
          callback({
            status: 200,
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
                container: (component.oc.container === false) ? false : true,
                renderInfo: (component.oc.renderInfo === false) ? false : true 
              };

          var returnResult = function(template){
            client.renderTemplate(template, data, renderOptions, function(err, html){
              callback({
                status: 200, 
                response: _.extend(response, { html: html })
              });
            });
          };

          if(!!cached && !conf.local){
            returnResult(cached);
          } else {
            repository.getCompiledView(component.name, component.version, function(err, templateText){
              var context = { jade: require('jade/runtime.js')};
              vm.runInNewContext(templateText, context);
              var template = context.oc.components[key];
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
              acceptLanguage: acceptLanguageParser.parse(options.headers['accept-language']),
              baseUrl: conf.baseUrl,
              env: conf.env,
              params: params,
              plugins: conf.plugins,
              staticPath: repository.getStaticFilePath(component.name, component.version, '').replace('https:', '')
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

        if(!!cached && !conf.local){
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
};
