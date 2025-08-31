import type { Express } from 'express';
import type { Repository } from '../registry/domain/repository';
import settings from '../resources/settings';
import type { Config } from '../types';
import IndexRoute from './routes';
import ComponentRoute from './routes/component';
import ComponentInfoRoute from './routes/component-info';
import ComponentPreviewRoute from './routes/component-preview';
import ComponentsRoute from './routes/components';
import DependenciesRoute from './routes/dependencies';
import HistoryRoute from './routes/history';
import PluginsRoute from './routes/plugins';
import PublishRoute from './routes/publish';
import StaticRedirectorRoute from './routes/static-redirector';
import ValidateRoute from './routes/validate';

export function create(app: Express, conf: Config, repository: Repository) {
  const routes = {
    component: ComponentRoute(conf, repository),
    components: ComponentsRoute(conf, repository),
    componentInfo: ComponentInfoRoute(conf, repository),
    componentPreview: ComponentPreviewRoute(conf, repository),
    index: IndexRoute(repository),
    publish: PublishRoute(repository),
    staticRedirector: StaticRedirectorRoute(repository),
    plugins: PluginsRoute(conf),
    dependencies: DependenciesRoute(conf),
    history: HistoryRoute(repository),
    validate: ValidateRoute()
  };

  const prefix = conf.prefix;

  if (prefix !== '/') {
    app.get('/', (_req, res) => res.redirect(prefix));
    app.get(prefix.substring(0, prefix.length - 1), routes.index);
  }

  app.get(`${prefix}oc-client/client.js`, routes.staticRedirector);
  app.get(`${prefix}oc-client/client.dev.js`, routes.staticRedirector);
  app.get(`${prefix}oc-client/oc-client.min.map`, routes.staticRedirector);

  app.get(`${prefix}~registry/plugins`, routes.plugins);
  app.get(`${prefix}~registry/dependencies`, routes.dependencies);
  app.get(`${prefix}~registry/history`, routes.history);
  if (conf.discovery.validate) {
    app.post(`${prefix}~registry/validate`, routes.validate);
  }
  app.post(
    `${prefix}~registry/validate/:componentName/:componentVersion`,
    routes.validate
  );

  if (conf.local) {
    app.get(
      `${prefix}:componentName/:componentVersion/${settings.registry.localStaticRedirectorPath}*splat`,
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

  app.post(
    `${prefix}~actions/:action/:componentName/:componentVersion`,
    routes.component
  );
  app.post(`${prefix}~actions/:action/:componentName`, routes.component);

  if (conf.routes) {
    for (const route of conf.routes) {
      app[
        route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'head'
      ](route.route, route.handler);
    }
  }
}
