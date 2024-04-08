import settings from '../../resources/settings';
import strings from '../../resources';
import { Config } from '../../types';
import {
  GetComponentResult,
  RendererOptions
} from '../routes/helpers/get-component';

interface Options {
  ip?: string;
  version?: string;
  name?: string;
  headers?: Record<string, string>;
  parameters?: Record<string, string>;
}

export default function nestedRenderer(
  rendererWithCallback: (
    options: RendererOptions,
    cb: (result: GetComponentResult) => void
  ) => void,
  conf: Config
) {
  const renderer = (options: RendererOptions) =>
    new Promise<string>((res, rej) => {
      rendererWithCallback(options, (result) => {
        if (result.response.error) {
          rej(result.response.error);
        } else {
          res(result.response.html!);
        }
      });
    });

  return {
    renderComponent(
      componentName: string,
      options: Options = {}
    ): Promise<string> {
      if (!componentName) {
        throw new Error(
          strings.errors.registry.NESTED_RENDERER_COMPONENT_NAME_IS_NOT_VALID
        );
      }

      return renderer({
        conf: conf,
        ip: options.ip || '',
        headers: {
          ...options.headers,
          accept: settings.registry.acceptRenderedHeader
        },
        name: componentName,
        parameters: options.parameters || {},
        version: options.version || ''
      });
    },
    renderComponents(
      components: Options[],
      options: Options = {}
    ): Promise<Array<string | Error>> {
      if (!components || !components.length) {
        throw new Error(
          strings.errors.registry.NESTED_RENDERER_COMPONENTS_IS_NOT_VALID
        );
      }

      return Promise.all(
        components.map((component) => {
          return renderer({
            conf: conf,
            headers: {
              ...options.headers,
              accept: settings.registry.acceptRenderedHeader
            },
            ip: component.ip || '',
            name: component.name!,
            parameters: {
              ...options.parameters,
              ...component.parameters
            },
            version: component.version || ''
          }).catch((err) => new Error(err));
        })
      );
    }
  };
}
