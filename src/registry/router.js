'use strict';

const _ = require('lodash');

const ComponentRoute = require('./routes/component');
const ComponentsRoute = require('./routes/components');
const ComponentInfoRoute = require('./routes/component-info');
const ComponentPreviewRoute = require('./routes/component-preview');
const IndexRoute = require('./routes');
const PublishRoute = require('./routes/publish');
const StaticRedirectorRoute = require('./routes/static-redirector');
const PluginsRoute = require('./routes/plugins');
const DependenciesRoute = require('./routes/dependencies');
const settings = require('../resources/settings').default;

module.exports.create = function(app, conf, repository) {
  const routes = {
    component: ComponentRoute(conf, repository),
    components: ComponentsRoute(conf, repository),
    componentInfo: ComponentInfoRoute(conf, repository),
    componentPreview: ComponentPreviewRoute(conf, repository),
    index: IndexRoute(repository),
    publish: PublishRoute(repository),
    staticRedirector: StaticRedirectorRoute(repository),
    plugins: PluginsRoute(conf),
    dependencies: DependenciesRoute(conf)
  };

  const prefix = conf.prefix;

  if (prefix !== '/') {
    app.get('/', (req, res) => res.redirect(prefix));
    app.get(prefix.substr(0, prefix.length - 1), routes.index);
  }

  app.get(`${prefix}oc-client/client.js`, routes.staticRedirector);
  app.get(`${prefix}oc-client/oc-client.min.map`, routes.staticRedirector);

  app.get(`${prefix}~registry/plugins`, routes.plugins);
  app.get(`${prefix}~registry/dependencies`, routes.dependencies);

  if (conf.local) {
    app.get(
      `${prefix}:componentName/:componentVersion/${settings.registry.localStaticRedirectorPath}*`,
      routes.staticRedirector
    );
  } else {
    app.put(
      `${prefix}:componentName/:componentVersion`,
      conf.beforePublish,
      routes.publish
    );
  }

  app.get(prefix, routes.index);
  app.post(prefix, routes.components);

  app.get(
    `${prefix}:componentName/:componentVersion${settings.registry.componentInfoPath}`,
    routes.componentInfo
  );
  app.get(
    `${prefix}:componentName${settings.registry.componentInfoPath}`,
    routes.componentInfo
  );

  app.get(
    `${prefix}:componentName/:componentVersion${settings.registry.componentPreviewPath}`,
    routes.componentPreview
  );
  app.get(
    `${prefix}:componentName${settings.registry.componentPreviewPath}`,
    routes.componentPreview
  );

  app.get(`${prefix}:componentName/:componentVersion`, routes.component);
  app.get(`${prefix}:componentName`, routes.component);

  if (conf.routes) {
    _.forEach(conf.routes, route =>
      app[route.method.toLowerCase()](route.route, route.handler)
    );
  }

  app.set('etag', 'strong');

  return app;
};
