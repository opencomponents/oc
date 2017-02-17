'use strict';

var format = require('stringformat');

var GetOCClientScript = require('./get-oc-client-script');
var HrefBuilder = require('./href-builder');
var htmlRenderer = require('./html-renderer');
var settings = require('./settings');
var templates = require('./templates');
var _ = require('./utils/helpers');

module.exports = function(cache, config){

  var getOCClientScript = new GetOCClientScript(cache),
      buildHref = new HrefBuilder(config);

  return function(toDo, options, cb){
    var toProcess = [];

    _.each(toDo, function(action){
      if(action.render === 'client' && !action.done){
        toProcess.push(action);
      }
    });

    if(_.isEmpty(toProcess)){
      return cb();
    }

    getOCClientScript(function(clientErr, clientJs){
      _.each(toDo, function(action){
        if(action.render === 'client'){
          if(!!clientErr || !clientJs){
            action.result.error = settings.genericError;
            action.result.html = '';
          } else {
            var componentClientHref;
            try {
              componentClientHref = buildHref.client(action.component, options);
            } catch (err) {
              action.result.error = err;
              action.result.html = '';
              return;
            }
            
            var unrenderedComponentTag = htmlRenderer.unrenderedComponent(componentClientHref, options);

            if(action.failover){
              action.result.html = format(templates.clientScript, clientJs, unrenderedComponentTag);
            } else {
              action.result.error = null;
              action.result.html = unrenderedComponentTag;
            }
          }
        }
      });

      cb();
    });
  };
};