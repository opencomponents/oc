'use strict';

const format = require('stringformat');
const _ = require('lodash');

const ComponentRoute = require('./routes/component');
const ComponentsRoute = require('./routes/components');
const ComponentInfoRoute = require('./routes/component-info');
const ComponentPreviewRoute = require('./routes/component-preview');
const ListComponentsRoute = require('./routes/list-components');
const PublishRoute = require('./routes/publish');
const settings = require('../resources/settings');
const StaticRedirectorRoute = require('./routes/static-redirector');

module.exports.create = function(app, conf, repository){
  const routes = {
    component: new ComponentRoute(conf, repository),
    components: new ComponentsRoute(conf, repository),
    componentInfo: new ComponentInfoRoute(conf, repository),
    componentPreview: new ComponentPreviewRoute(conf, repository),
    listComponents: new ListComponentsRoute(repository),
    publish: new PublishRoute(repository),
    staticRedirector: new StaticRedirectorRoute(repository)
  };

  if(conf.prefix !== '/'){
    app.get('/', (req, res) => { res.redirect(conf.prefix); });
    app.get(conf.prefix.substr(0, conf.prefix.length - 1), routes.listComponents);
  }

  app.get(conf.prefix + 'oc-client/client.js', routes.staticRedirector);
  app.get(conf.prefix + 'oc-client/oc-client.min.map', routes.staticRedirector);

  if(conf.local){
    app.get(format('{0}:componentName/:componentVersion/{1}*', conf.prefix, settings.registry.localStaticRedirectorPath), routes.staticRedirector);
  } else {
    app.put(conf.prefix + ':componentName/:componentVersion', conf.beforePublish, routes.publish);
  }

  app.get(conf.prefix, routes.listComponents);
  app.post(conf.prefix, routes.components);

  app.get(format('{0}:componentName/:componentVersion{1}', conf.prefix, settings.registry.componentInfoPath), routes.componentInfo);
  app.get(format('{0}:componentName{1}', conf.prefix, settings.registry.componentInfoPath), routes.componentInfo);

  app.get(format('{0}:componentName/:componentVersion{1}', conf.prefix, settings.registry.componentPreviewPath), routes.componentPreview);
  app.get(format('{0}:componentName{1}', conf.prefix, settings.registry.componentPreviewPath), routes.componentPreview);

  app.get(conf.prefix + ':componentName/:componentVersion', routes.component);
  app.get(conf.prefix + ':componentName', routes.component);

  if(conf.routes){
    _.forEach(conf.routes, (route) => {
      app[route.method.toLowerCase()](route.route, route.handler);
    });
  }

  app.set('etag', 'strong');

  return app;
};
