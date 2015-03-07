'use strict';

var acceptLanguageParser = require('accept-language-parser');
var Cache = require('nice-cache');
var Client = require('../../client');
var format = require('stringformat');
var RequireWrapper = require('../domain/require-wrapper');
var sanitiser = require('../domain/sanitiser');
var urlBuilder = require('../domain/url-builder');
var validator = require('../domain/validator');
var vm = require('vm');
var _ = require('underscore');

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

    var conf = res.conf;

    repository.getComponent(requestedComponent.name, requestedComponent.version, function(err, component){

      // check route exist for component and version
      if(err){
        res.errorDetails = err;
        return res.json(404, { err: err });
      }

      // sanitise params
      var params = sanitiser.sanitiseComponentParameters(requestedComponent.parameters, component.oc.parameters);

      // check params
      var result = validator.validateComponentParameters(params, component.oc.parameters);

      if(!result.isValid){
        res.errorDetails = result.errors.message;
        return res.json(400, { error: res.errorDetails });
      }

      var returnComponent = function(err, data){
        if(err){
          res.errorDetails = 'component data resolving error';
          return res.json(502, { error: res.errorDetails });
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
          requestVersion: requestedComponent.version
        };
        
        if(req.headers.accept === 'application/vnd.oc.prerendered+json'){
          res.json(200, _.extend(response, {
            data: data,
            template: {
              src: repository.getStaticFilePath(component.name, component.version, 'template.js'),
              type: component.oc.files.template.type,
              key: component.oc.files.template.hashKey
            },
            renderMode: 'pre-rendered'
          }));        
        } else {

          var cacheKey = format('{0}/{1}/template.js', component.name, component.version),
              cached = cache.get('file-contents', cacheKey),
              key = component.oc.files.template.hashKey,
              options = {
                href: componentHref,
                key: key,
                version: component.version,
                templateType: component.oc.files.template.type
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
            reqObj = { 
              acceptLanguage: acceptLanguageParser.parse(req.headers['accept-language']),
              baseUrl: conf.baseUrl,
              env: conf.env,
              params: params,
              staticPath: repository.getStaticFilePath(component.name, component.version, '').replace('https:', '')
            };

        if(!!cached && !res.conf.local){
          cached(reqObj, returnComponent);
        } else {
          repository.getDataProvider(component.name, component.version, function(err, dataProcessorJs){
            if(err){
              res.errorDetails = 'component resolving error';
              return res.json(502, { error: res.errorDetails });
            }

            var context = { 
              require: new RequireWrapper(res.conf.dependencies), 
              module: { 
                exports: {}
              },
              console: res.conf.local ? console : { log: _.noop }
            };

            vm.runInNewContext(dataProcessorJs, context);
            var processData = context.module.exports.data;
            cache.set('file-contents', cacheKey, processData);        
            processData(reqObj, returnComponent);
          });
        }
      }
    });
  };
};