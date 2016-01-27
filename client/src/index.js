'use strict';

var Cache = require('nice-cache');
var format = require('stringformat');
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');
var url = require('url');
var vm = require('vm');

var Handlebars = require('./renderers/handlebars');
var Jade = require('./renderers/jade');

var request = require('./utils/request');
var sanitiser = require('./sanitiser');
var settings = require('./settings');
var templates = require('./templates');
var validator = require('./validator');
var _ = require('./utils/helpers');

var isLocal = function(apiResponse){
  return apiResponse.type === 'oc-component-local';
};
  
var getRenderedComponent = function(data){

  if(!!data.name && data.renderInfo !== false){
    data.html += format(templates.renderInfo, data.name, data.version);
  }

  if(data.container !== false){ 
    data.html = format(templates.componentTag, data.href, data.key, data.name || '', data.version, data.html);
  }

  return data.html;
};

var getUnrenderedComponent = function(href, options){
  var youCareAboutIe8 = !!options && !!options.ie8,
      template = templates['componentUnrenderedTag' + (youCareAboutIe8 ? 'Ie8' : '')];

  return format(template, href);
};

module.exports = function(conf){

  var config = sanitiser.sanitiseConfiguration(conf),
      validationResult = validator.validateConfiguration(config),
      self = this;

  if(!validationResult.isValid){
    throw validationResult.error;
  }

  this.renderers = {
    handlebars: new Handlebars(),
    jade: new Jade()
  };

  var cache = new Cache(config.cache);

  var getCompiledTemplate = function(template, tryGetCached, timeout, callback){
    if(!!tryGetCached){
      var compiledTemplate = cache.get('template', template.key);
      if(!!compiledTemplate){
        return callback(null, compiledTemplate);
      }
    }

    request(template.src, {}, timeout, function(err, templateText){

      if(!!err){ return callback(err); }

      var context = { jade: require('jade/runtime.js')};
      vm.runInNewContext(templateText, context);
      var compiledTemplate = context.oc.components[template.key];
      cache.set('template', template.key, compiledTemplate);
      return callback(null, compiledTemplate);
     });
  };

  var buildComponentHrefs = function(name, params){

    var version = config.components[name],
        versionSegment = !!version ? (version + '/') : '';

    var getHref = function(renderMode){
      if(!!config.registries[renderMode]){
        var registryUrl = config.registries[renderMode],
            registrySegment = registryUrl.slice(-1) === '/' ? registryUrl : (registryUrl + '/'),
            qs = !!params ? ('?' + querystring.stringify(params)) : '';

        return url.resolve(registrySegment, name + '/') + versionSegment + qs;
      }
    };

    return {
      clientRendering: getHref('clientRendering'),
      serverRendering: getHref('serverRendering')
    };
  };

  this.renderComponent = function(componentName, options, callback){
    if(_.isFunction(options)){
      callback = options;
      options = {};
    }

    options = options || {};
    options.headers = options.headers || {};
    options.timeout = options.timeout || 5;

    if(!_.has(config.components, componentName)){
      config.components[componentName] = '';
    }

    self.render(buildComponentHrefs(componentName, options.params), options, callback);
  };

  this.render = function(hrefs, options, callback){
    if(_.isFunction(options)){
      callback = options;
      options = {};
    }

    options = options || {};
    options.headers = options.headers || {};
    options.headers.accept = 'application/vnd.oc.unrendered+json';
    options.timeout = options.timeout || 5;

    var processError = function(){
      var errorDescription = settings.messages.serverSideRenderingFail;

      if(!!options.disableFailoverRendering){
        return callback(errorDescription, '');
      }

      fs.readFile(path.resolve(__dirname, './oc-client.min.js'), 'utf-8', function(err, clientJs){
        var clientSideHtml = format(templates.clientScript, clientJs, getUnrenderedComponent(hrefs.clientRendering, options));
        return callback(errorDescription, clientSideHtml);
      });
    };

    if(options.render === 'client'){
      return callback(null, getUnrenderedComponent(hrefs.clientRendering, options));
    }

    request(hrefs.serverRendering, options.headers, options.timeout, function(err, apiResponse){

      if(err){
        return processError();
      } else {

        try {
          apiResponse = JSON.parse(apiResponse);
        } catch(e){
          return processError();
        }

        var data = apiResponse.data,
            local = isLocal(apiResponse);

        getCompiledTemplate(apiResponse.template, !local, options.timeout, function(err, template){

          if(!!err){ return processError(); }

          var renderOptions = {
            href: hrefs.clientRendering,
            key: apiResponse.template.key,
            version: apiResponse.version,
            templateType: apiResponse.template.type,
            container: (options.container === true) ? true : false,
            renderInfo: (options.renderInfo === false) ? false : true,
            name: apiResponse.name
          };

          return self.renderTemplate(template, data, renderOptions, callback);
        });
      }
    });
  };

  this.renderTemplate = function(template, data, options, callback){
    this.renderers[options.templateType].render(template, data, function(err, html){
      options.html = html;
      return callback(err, getRenderedComponent(options));
    });
  };
};