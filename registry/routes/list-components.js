'use strict';

var packageInfo = require('../../package.json');
var urlBuilder = require('../domain/url-builder');
var _ = require('underscore');
var async = require('async');

module.exports = function(repository){
  return function(req, res, next){

    repository.getComponents(function(err, components){
      if(err){
        res.errorDetails = 'cdn not available';
        return res.json(404, { error: res.errorDetails });
      }

      var componentInfo = [];

      if (req.headers.accept && req.headers.accept.indexOf('text/html') > -1) {

        async.each(components, function(component, callback){
          return repository.getComponent(component, function (err, result) {
            if (err) {
              return callback(err);
            }

            componentInfo.push(result);
            callback();
          });
        }, function(err){
          if(err){
            return next(err);
          }

          return res.render('list-components', {
            href: res.conf.baseUrl,
            components:componentInfo,
            type: res.conf.local ? 'oc-registry-local' : 'oc-registry',
            ocVersion: packageInfo.version
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