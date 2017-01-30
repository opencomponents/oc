'use strict';

var parseAuthor = require('parse-author');
var _ = require('underscore');

var urlBuilder = require('../domain/url-builder');

module.exports = function(repository){
  return function(req, res){

    repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, component){

      if(err){
        res.errorDetails = err;
        return res.status(404).json({ err: err });
      }

      var isHtmlRequest = !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

      if(isHtmlRequest && !!res.conf.discovery){

        var params = {},
            author = component.author || {},
            parsedAuthor = _.isString(author) ? parseAuthor(author) : author;

        if(!!component.oc.parameters){
          var mandatoryParams = _.filter(_.keys(component.oc.parameters), function(paramName){
            var param = component.oc.parameters[paramName];
            return !!param.mandatory && !!param.example;
          });

          params = _.mapObject(_.pick(component.oc.parameters, mandatoryParams), function(param){
            return param.example;
          });
        }

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
  };
};