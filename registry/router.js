'use strict';

var ComponentRoute = require('./routes/component');
var ComponentInfoRoute = require('./routes/component-info');
var ListComponentsRoute = require('./routes/list-components');
var PublishRoute = require('./routes/publish');
var StaticRedirectorRoute = require('./routes/static-redirector');

module.exports = function(conf, repository){
  return {
    component: new ComponentRoute(conf, repository),
    componentInfo: new ComponentInfoRoute(repository),
    listComponents: new ListComponentsRoute(repository),
    publish: new PublishRoute(repository),
    staticRedirector: new StaticRedirectorRoute(repository)
  };
};