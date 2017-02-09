'use strict';

var parseAuthor = require('parse-author');
var _ = require('underscore');

var urlBuilder = require('../domain/url-builder');
var getComponentInfoOrPreviewFallback = require('./helpers/get-component-fallback').getComponentInfoOrPreviewFallback;

function getParams(component) {
  var params = {};
  if(!!component.oc.parameters){
    var mandatoryParams = _.filter(_.keys(component.oc.parameters), function(paramName){
      var param = component.oc.parameters[paramName];
      return !!param.mandatory && !!param.example;
    });

    params = _.mapObject(_.pick(component.oc.parameters, mandatoryParams), function(param){
      return param.example;
    });
  }

  return params;
}

function getParsedAuthor(component) {
  var author = component.author || {};
  return _.isString(author) ? parseAuthor(author) : author;
}

function addGetRepositoryUrlFunction(component) {
  component.getRepositoryUrl = function() {
    if (_.isObject(this.repository)) {
      if (this.repository.url) {
        return this.repository.url;
      }
    }
    if (_.isString(this.repository)) {
      return this.repository;
    }
    return null;
  };
}

module.exports = function(conf, repository){
  return function(req, res){

    repository.getComponent(req.params.componentName, req.params.componentVersion, function(localRegistryError, localComponent){

      getComponentInfoOrPreviewFallback(conf, req, res, localRegistryError, localComponent, function(err, component) {
        if(err) {
          res.errorDetails = err.localError;
          return res.status(404).json(err);
        }

        var isHtmlRequest = !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

        if(isHtmlRequest && !!res.conf.discovery){

          var params = getParams(component);
          var parsedAuthor = getParsedAuthor(component);
          addGetRepositoryUrlFunction(component);

          return res.render('component-info', {
            component: component,
            dependencies: _.keys(component.dependencies),
            href: res.conf.baseUrl,
            parsedAuthor: parsedAuthor,
            sandBoxDefaultQs: urlBuilder.queryString(params)
          });

        } else {
          res.status(200).json(_.extend(component, {
            requestVersion: req.params.componentVersion || ''
          }));
        }
      });

    });
  };
};