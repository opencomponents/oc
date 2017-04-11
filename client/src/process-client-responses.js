'use strict';

const format = require('stringformat');

const GetOCClientScript = require('./get-oc-client-script');
const HrefBuilder = require('./href-builder');
const htmlRenderer = require('./html-renderer');
const settings = require('./settings');
const templates = require('./templates');
const _ = require('./utils/helpers');

module.exports = function(cache, config){

  const getOCClientScript = new GetOCClientScript(cache),
    buildHref = new HrefBuilder(config);

  return function(toDo, options, cb){
    const toProcess = [];

    _.each(toDo, (action) => {
      if(action.render === 'client' && !action.done){
        toProcess.push(action);
      }
    });

    if(_.isEmpty(toProcess)){
      return cb();
    }

    getOCClientScript((clientErr, clientJs) => {
      _.each(toDo, (action) => {
        if(action.render === 'client'){
          if(!!clientErr || !clientJs){
            action.result.error = settings.genericError;
            action.result.html = '';
          } else {
            let componentClientHref;
            try {
              componentClientHref = buildHref.client(action.component, options);
            } catch (err) {
              action.result.error = err;
              action.result.html = '';
              return;
            }

            const unrenderedComponentTag = htmlRenderer.unrenderedComponent(componentClientHref, options);

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