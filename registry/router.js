'use strict';

var ComponentRoute = require('./routes/component');
var ComponentsRoute = require('./routes/components');
var ComponentInfoRoute = require('./routes/component-info');
var ComponentPreviewRoute = require('./routes/component-preview');
var ListComponentsRoute = require('./routes/list-components');
var PublishRoute = require('./routes/publish');
var StaticRedirectorRoute = require('./routes/static-redirector');

module.exports = function(conf, repository){
  return {
    component: new ComponentRoute(conf, repository),
    components: new ComponentsRoute(conf, repository),
    componentInfo: new ComponentInfoRoute(repository),
    componentPreview: new ComponentPreviewRoute(repository),
    listComponents: new ListComponentsRoute(repository),
    publish: new PublishRoute(repository),
    staticRedirector: new StaticRedirectorRoute(repository)
  };
};