import async from 'async';
import _ from 'lodash';

import settings from '../../resources/settings';
import strings from '../../resources';
import { Config } from '../../types';

type Cb = Callback<string, string>;
type Options = {
  version?: string;
  name?: string;
  headers?: Dictionary<string>;
  parameters?: Dictionary<string>;
};
type Params = {
  components: Options[];
  options: Options;
  callback: Cb;
};

const sanitise = {
  componentParams(component: string, options: Options | Cb, callback?: Cb) {
    return {
      ...sanitise.options(options, callback),
      componentName: component
    };
  },
  componentsParams(
    components: Options[],
    options: Options | Cb,
    callback: Cb
  ): Params {
    return {
      ...sanitise.options(options, callback),
      components: components
    };
  },
  headers(h = {}) {
    return {
      ...h,
      accept: settings.registry.acceptRenderedHeader
    };
  },
  options(
    options: Options | Cb,
    callback?: Cb
  ): { options: Options; callback: Cb } {
    const cb = !callback && typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? {} : options;

    return { callback: cb!, options: opts };
  }
};

const validate = {
  callback(c: Cb) {
    if (!c || typeof c !== 'function') {
      throw new Error(
        strings.errors.registry.NESTED_RENDERER_CALLBACK_IS_NOT_VALID
      );
    }
  },
  componentParams(params: { componentName: string; callback: Cb }) {
    if (!params.componentName) {
      throw new Error(
        strings.errors.registry.NESTED_RENDERER_COMPONENT_NAME_IS_NOT_VALID
      );
    }

    validate.callback(params.callback);
  },
  componentsParams(params: Params) {
    if (_.isEmpty(params.components)) {
      throw new Error(
        strings.errors.registry.NESTED_RENDERER_COMPONENTS_IS_NOT_VALID
      );
    }

    validate.callback(params.callback);
  }
};

export default function nestedRenderer(renderer: any, conf: Config) {
  return {
    renderComponent(
      componentName: string,
      renderOptions: Options | Cb,
      callback?: Cb
    ) {
      const p = sanitise.componentParams(
        componentName,
        renderOptions,
        callback
      );
      validate.componentParams(p);

      return renderer(
        {
          conf: conf,
          headers: sanitise.headers(p.options.headers),
          name: componentName,
          parameters: p.options.parameters || {},
          version: p.options.version || ''
        },
        (result: any) => {
          if (result.response.error) {
            return p.callback(result.response.error, undefined as any);
          } else {
            return p.callback(null, result.response.html);
          }
        }
      );
    },
    renderComponents(
      components: Options[],
      renderOptions: Options,
      callback: Cb
    ) {
      const p = sanitise.componentsParams(components, renderOptions, callback);
      validate.componentsParams(p);

      async.map(
        p.components,
        (component, cb) => {
          renderer(
            {
              conf: conf,
              headers: sanitise.headers(p.options.headers),
              name: component.name,
              parameters: {
                ...p.options.parameters,
                ...component.parameters
              },
              version: component.version || ''
            },
            (result: any) => {
              const error = result.response.error;
              cb(null, error ? new Error(error) : result.response.html);
            }
          );
        },
        p.callback as any
      );
    }
  };
}
