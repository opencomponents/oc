'use strict';

var acceptLanguageParser = require('accept-language-parser');
var Cache = require('nice-cache');
var Domain = require('domain');
var format = require('stringformat');
var vm = require('vm');
var _ = require('underscore');

var Client = require('../../client');
var detective = require('../domain/plugins-detective');
var RequireWrapper = require('../domain/require-wrapper');
var sanitiser = require('../domain/sanitiser');
var strings = require('../../resources');
var urlBuilder = require('../domain/url-builder');
var validator = require('../domain/validators');

module.exports = function(conf, repository){

  var client = new Client(conf),
      cache = new Cache({
        verbose: !!conf.verbosity,
        refreshInterval: conf.refreshInterval
      });

  return function(req, res){

    var requestedComponent = {
      name: req.params.componentName,
      version: req.params.componentVersion || '',
      parameters: req.query
    };

    var conf = res.conf,
        componentCallbackDone = false;

    repository.getComponent(requestedComponent.name, requestedComponent.version, function(err, component){

      // check route exist for component and version
      if(err){
        res.errorDetails = err;
        return res.json(404, { err: err });
      }

      // check component requirements are satisfied by registry      
      var pluginsCompatibility = validator.validatePluginsRequirements(component.oc.plugins, conf.plugins);

      if(!pluginsCompatibility.isValid){
        res.errorDetails = format(strings.errors.registry.PLUGIN_NOT_IMPLEMENTED, pluginsCompatibility.missing.join(', '));
        res.errorCode = 'PLUGIN_MISSING_FROM_REGISTRY';

        return res.json(501, {
          code: res.errorCode,
          error: res.errorDetails, 
          missingPlugins: pluginsCompatibility.missing
        });
      }

      // sanitise and check params
      var params = sanitiser.sanitiseComponentParameters(requestedComponent.parameters, component.oc.parameters),
          validationResult = validator.validateComponentParameters(params, component.oc.parameters);

      if(!validationResult.isValid){
        res.errorDetails = validationResult.errors.message;
        return res.json(400, { error: res.errorDetails });
      }

      var returnComponent = function(err, data){

        if(componentCallbackDone){ return; }
        componentCallbackDone = true;

        if(!!err){
          res.errorDetails = format(strings.errors.registry.COMPONENT_EXECUTION_ERROR, err.message || '');
          return res.json(500, { error: res.errorDetails, details: { message: err.message, stack: err.stack, originalError: err} });
        }

        var componentHref = urlBuilder.component({
          name: component.name,
          version: requestedComponent.version,
          parameters: params
        }, res.conf.baseUrl);

        var response = {
          href: componentHref,
          type: res.conf.local ? 'oc-component-local' : 'oc-component',
          version: component.version,
          requestVersion: requestedComponent.version,
          name: requestedComponent.name
        };
        
        if(req.headers.accept === 'application/vnd.oc.prerendered+json' ||
           req.headers.accept === 'application/vnd.oc.unrendered+json'){
          res.json(200, _.extend(response, {
            data: data,
            template: {
              src: repository.getStaticFilePath(component.name, component.version, 'template.js'),
              type: component.oc.files.template.type,
              key: component.oc.files.template.hashKey
            },
            renderMode: 'unrendered'
          }));
        } else {

          var cacheKey = format('{0}/{1}/template.js', component.name, component.version),
              cached = cache.get('file-contents', cacheKey),
              key = component.oc.files.template.hashKey,
              options = {
                href: componentHref,
                key: key,
                version: component.version,
                name: component.name,
                templateType: component.oc.files.template.type,
                container: (component.oc.container === false) ? false : true,
                renderInfo: (component.oc.renderInfo === false) ? false : true 
              };

          var returnResult = function(template){
            client.renderTemplate(template, data, options, function(err, html){
              res.json(200, _.extend(response, { 
                html: html, 
                renderMode: 'rendered'
              }));
            });
          };

          if(!!cached && !res.conf.local){
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
              acceptLanguage: acceptLanguageParser.parse(req.headers['accept-language']),
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

        if(!!cached && !res.conf.local){
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
              res.errorDetails = strings.errors.registry.RESOLVING_ERROR;
              return res.json(502, { error: res.errorDetails });
            }

            var context = { 
              require: new RequireWrapper(res.conf.dependencies), 
              module: { 
                exports: {}
              },
              console: res.conf.local ? console : { log: _.noop },
              setTimeout: setTimeout,
              Buffer: Buffer
            };


            var handleError = function(err){

              if(err.code === 'DEPENDENCY_MISSING_FROM_REGISTRY'){
                res.errorDetails = format(strings.errors.registry.DEPENDENCY_NOT_FOUND, err.missing.join(', '));
                res.errorCode = err.code;
                componentCallbackDone = true;

                return res.json(501, {
                  code: res.errorCode,
                  error: res.errorDetails,
                  missingDependencies: err.missing
                });
              }

              var usedPlugins = detective.parse(dataProcessorJs),
                  unRegisteredPlugins = _.difference(usedPlugins, _.keys(res.conf.plugins));

              if(!_.isEmpty(unRegisteredPlugins)){

                res.errorDetails = format(strings.errors.registry.PLUGIN_NOT_FOUND, unRegisteredPlugins.join(' ,'));
                res.errorCode = 'PLUGIN_MISSING_FROM_COMPONENT';
                componentCallbackDone = true;
                
                return res.json(501, {
                  code: res.errorCode,
                  error: res.errorDetails, 
                  missingPlugins: unRegisteredPlugins
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
