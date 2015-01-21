'use strict';

var acceptLanguageParser = require('accept-language-parser');
var Client = require('../../client');
var fs = require('fs-extra');
var path = require('path');
var Repository = require('../domain/repository');
var RequireWrapper = require('../domain/require-wrapper');
var sanitiser = require('../domain/sanitiser');
var Targz = require('tar.gz');
var url = require('url');
var urlBuilder = require('./url-builder');
var validator = require('../domain/validator');
var versionHandler = require('../domain/version-handler');
var vm = require('vm');
var _ = require('underscore');

var repository, 
    targz,
    client;

exports.init = function(conf){
  repository = new Repository(conf);
  targz = new Targz();
  client = new Client(conf);
};

exports.index = function(req, res){

  repository.getComponents(function(err, components){
    if(err){
      return res.json(404, { error: 'cdn not available'});
    }

    res.json(200, {
      href: res.conf.baseUrl,
      components: _.map(components, function(component){
        return urlBuilder.component(component, res.conf.baseUrl);
      }),
      clientAgent: url.resolve(res.conf.baseUrl, '../scripts/oc-client.min.js'),
      type: res.conf.local ? 'oc-registry-local' : 'oc-registry'
    });
  });
};

exports.componentInfo = function(req, res){

  repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, component){

    if(err){
      return res.json(404, { err: err });
    }

    res.json(200, _.extend(component, {
      requestVersion: req.params.componentVersion || ''
    }));
  });

};

exports.component = function(req, res){

  var requestedComponent = {
    name: req.params.componentName,
    version: req.params.componentVersion || '',
    parameters: req.query
  };

  var conf = res.conf;

  repository.getComponent(requestedComponent.name, requestedComponent.version, function(err, component){

    // check route exist for component and version
    if(err){
      return res.json(404, { err: err });
    }

    // sanitise params
    var params = sanitiser.sanitiseComponentParameters(requestedComponent.parameters, component.oc.parameters);

    // check params
    var result = validator.validateComponentParameters(params, component.oc.parameters);

    if(!result.isValid){
      return res.json(400, { error: result.errors.message });
    }

    var returnComponent = function(err, data){
      if(err){
        return res.json(502, { error: 'component data resolving error' });
      }

      var componentHref = urlBuilder.component({
        name: component.name,
        version: requestedComponent.version,
        parameters: params
      }, res.conf.baseUrl);

      var response = {
        href: componentHref,
        version: component.version,
        requestVersion: requestedComponent.version
      };

      if(req.headers['render-mode'] === 'pre-rendered'){
        res.json(200, _.extend(response, {
          data: data,
          template: {
            src: repository.getStaticFilePath(component.name, component.version, 'template.js'),
            type: component.oc.files.template.type,
            key: component.oc.files.template.hashKey
          },
          components: component.oc.dependencies,
          type: res.conf.local ? 'oc-component-local' : 'oc-component',
          renderMode: 'pre-rendered'
        }));        
      } else {
        repository.getCompiledView(component.name, component.version, function(err, templateText){

          var context = {};

          vm.runInNewContext(templateText, context);

          var key = component.oc.files.template.hashKey,
              template = context.oc.components[key],
              options = {
                href: componentHref,
                key: key,
                version: component.version
              };

          client.renderTemplate(template, data, options, function(err, html){
            res.json(200, _.extend(response, { 
              html: html, 
              renderMode: 'rendered'
            }));
          });
        });
      }
    };

    if(!component.oc.files.dataProvider){
      returnComponent(null, {});
    } else {
      repository.getDataProvider(component.name, component.version, function(err, dataProcessorJs){
        if(err){
          return res.json(502, { error: 'component resolving error'});
        }

        var context = { 
          require: new RequireWrapper(res.injectedDependencies), 
          module: { 
            exports: {}
          }
        };

        vm.runInNewContext(dataProcessorJs, context);

        var processData = context.module.exports.data;

        var reqObj = { 
          acceptLanguage: acceptLanguageParser.parse(req.headers['accept-language']),
          baseUrl: conf.baseUrl,
          env: conf.env,
          params: params,
          staticPath: repository.getStaticFilePath(component.name, component.version, '').replace('https:', '')
        };

        processData(reqObj, returnComponent);
      });
    }
  });
};

exports.staticRedirector = function(req, res){

  var filePath = path.join(res.conf.path, req.params.componentName) + '/_package/' + req.params[0];

  if(!fs.existsSync(filePath)){
    return res.json(404, { err: 'file not found' });
  }

  var fileStream = fs.createReadStream(filePath);

  fileStream.on('open', function(){
    fileStream.pipe(res);
  });
};

exports.publish = function(req, res){

  if(!req.params.componentName || !req.params.componentVersion){
    return res.json(409, { error: 'malformed request'});
  }

  if(!validator.validateVersion(req.params.componentVersion).isValid){
    return res.json(409, { error: 'not a valid version' });
  }
  
  if(!validator.validatePackage(req.files).isValid){
    return res.json(409, { error: 'package is not valid' });
  }

  var files = req.files,
      packageFile = files[_.keys(files)[0]],
      packagePath = path.resolve(packageFile.path),
      packageUntarOutput = path.resolve(packageFile.path, '..', packageFile.name.replace('.tar.gz', '')),
      packageOutput = path.resolve(packageUntarOutput, '_package');

  targz.extract(packagePath, packageUntarOutput, function(err){

    if(!!err){
      return res.json(500, { error: 'package file is not valid', details: err });
    }

    repository.publishComponent(packageOutput, req.params.componentName, req.params.componentVersion, function(err, result){
      
      if(err){
        if(err.code === 'not_allowed'){
          return res.json(403, { error: err.msg });
        } else if(err.code === 'already_exists'){
          return res.json(403, { error: err.msg });
        } else {
          return res.json(500, { error: err.msg });
        }
      }

      res.json(200, { ok: true });
    });
  });
};