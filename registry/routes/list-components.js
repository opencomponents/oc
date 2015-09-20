'use strict';

var async = require('async');
var _ = require('underscore');

var dateStringified = require('../../utils/date-stringify');
var packageInfo = require('../../package.json');
var urlBuilder = require('../domain/url-builder');

module.exports = function(repository){
  return function(req, res, next){

    repository.getComponents(function(err, components){
      if(err){
        res.errorDetails = 'cdn not available';
        return res.json(404, { error: res.errorDetails });
      }

      var isHtmlRequest = !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

      if(isHtmlRequest && !!res.conf.discovery){

        var componentsInfo = [],
            componentsReleases = 0;

        async.each(components, function(component, callback){
          return repository.getComponent(component, function(err, result){
            if(err){ return callback(err); }

            if(result.oc && result.oc.date) {
              result.oc.stringifiedDate = dateStringified(new Date(result.oc.date));
            }

            componentsInfo.push(result);
            componentsReleases += result.allVersions.length;
            callback();
          });
        }, function(err){
          if(err){ return next(err); }

          componentsInfo = _.sortBy(componentsInfo, function(componentInfo){
            return componentInfo.name;
          });

          return res.render('list-components', {
            availableDependencies: res.conf.dependencies,
            availablePlugins: res.conf.plugins,
            components: componentsInfo,
            componentsList: _.map(componentsInfo, function(component){ return component.name; }),
            componentsReleases: componentsReleases,
            href: res.conf.baseUrl,
            ocVersion: packageInfo.version,
            type: res.conf.local ? 'oc-registry-local' : 'oc-registry'
          });
        });
      } else {
        res.json(200, {
          href: res.conf.baseUrl,
          components: _.map(components, function(component){
            return urlBuilder.component(component, res.conf.baseUrl);
          }),
          type: res.conf.local ? 'oc-registry-local' : 'oc-registry',
          ocVersion: packageInfo.version
        });
      }
    });
  };
};
