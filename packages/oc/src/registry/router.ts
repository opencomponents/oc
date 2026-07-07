import type { Repository } from '../registry/domain/repository';
import settings from '../resources/settings';
import type { Config } from '../types';
import type {
  ExpressMiddleware,
  HttpServerAdapter,
  Method,
  OcHandler
} from './domain/http-server/types';
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

export function create(
  adapter: HttpServerAdapter,
  conf: Config,
  repository: Repository
) {
  const route = (
    method: Method,
    path: string,
    id: string,
    ...handlers: OcHandler[]
  ) => adapter.route(method, path, id, handlers);
  const routes = {
    component: ComponentRoute(conf, repository),
    components: ComponentsRoute(conf, repository),
    componentInfo: ComponentInfoRoute(conf, repository),
    componentPreview: ComponentPreviewRoute(conf, repository),
    index: IndexRoute(repository),
    publish: PublishRoute(repository),
    staticRedirector: {
      client: StaticRedirectorRoute(repository, 'client'),
      devClient: StaticRedirectorRoute(repository, 'dev-client'),
      clientMap: StaticRedirectorRoute(repository, 'client-map'),
      localStatic: StaticRedirectorRoute(repository, 'local-static')
    },
    plugins: PluginsRoute(conf),
    dependencies: DependenciesRoute(conf),
    history: HistoryRoute(repository),
    validate: ValidateRoute()
  };

  const prefix = conf.prefix;

  const definedBaseRoute = conf.routes?.find((route) => route.route === '/');

  if (prefix !== '/' && !definedBaseRoute) {
    route('get', '/', 'root-redirect', (_req, res) => res.redirect(prefix));
    route(
      'get',
      prefix.substring(0, prefix.length - 1),
      'prefix-index',
      routes.index
    );
  }

  route(
    'get',
    `${prefix}oc-client/client.js`,
    'client',
    routes.staticRedirector.client
  );
  route(
    'get',
    `${prefix}oc-client/client.dev.js`,
    'dev-client',
    routes.staticRedirector.devClient
  );
  route(
    'get',
    `${prefix}oc-client/oc-client.min.map`,
    'client-map',
    routes.staticRedirector.clientMap
  );

  route('get', `${prefix}~registry/plugins`, 'plugins', routes.plugins);
  route(
    'get',
    `${prefix}~registry/dependencies`,
    'dependencies',
    routes.dependencies
  );
  route('get', `${prefix}~registry/history`, 'history', routes.history);
  if (conf.discovery.validate) {
    route('post', `${prefix}~registry/validate`, 'validate', routes.validate);
  }

  if (conf.local) {
    route(
      'get',
      `${prefix}:componentName/:componentVersion/${settings.registry.localStaticRedirectorPath}*splat`,
      'local-static',
      routes.staticRedirector.localStatic
    );
  } else {
    route(
      'put',
      `${prefix}:componentName/:componentVersion`,
      'publish',
      adapter.fromConnect(conf.beforePublish),
      routes.publish
    );
  }

  route('get', prefix, 'index', routes.index);
  route('post', prefix, 'components', routes.components);

  route(
    'get',
    `${prefix}:componentName/:componentVersion${settings.registry.componentInfoPath}`,
    'component-version-info',
    routes.componentInfo
  );
  route(
    'get',
    `${prefix}:componentName${settings.registry.componentInfoPath}`,
    'component-info',
    routes.componentInfo
  );

  route(
    'get',
    `${prefix}:componentName/:componentVersion${settings.registry.componentPreviewPath}`,
    'component-version-preview',
    routes.componentPreview
  );
  route(
    'get',
    `${prefix}:componentName${settings.registry.componentPreviewPath}`,
    'component-preview',
    routes.componentPreview
  );

  route(
    'get',
    `${prefix}:componentName/:componentVersion`,
    'component-version',
    routes.component
  );
  route('get', `${prefix}:componentName`, 'component', routes.component);

  route(
    'post',
    `${prefix}~actions/:action/:componentName/:componentVersion`,
    'component-version-action',
    routes.component
  );
  route(
    'post',
    `${prefix}~actions/:action/:componentName`,
    'component-action',
    routes.component
  );

  if (conf.routes) {
    for (const routeConfig of conf.routes) {
      // Ensure handler is a function (should be converted by options-sanitiser)
      if (typeof routeConfig.handler === 'function') {
        route(
          routeConfig.method.toLowerCase() as Method,
          routeConfig.route,
          routeConfig.route,
          adapter.fromConnect(routeConfig.handler as ExpressMiddleware)
        );
      } else {
        console.warn(
          `Warning: Route handler for "${routeConfig.route}" is not a function. Skipping route.`
        );
      }
    }
  }
}
