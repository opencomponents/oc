import querystring from 'node:querystring';
import url from 'node:url';

type Component = {
  name: string;
  version?: string;
  parameters?: Record<string, string>;
};

function componentForType(
  component: Component | string,
  baseUrl: string,
  type: string
): string {
  if (typeof component === 'string') {
    component = { name: component };
  }

  let href = url.resolve(baseUrl, component.name) + '/';

  if (component.version) {
    href += component.version + '/';
  }

  href += '~' + type;

  return href;
}

export function component(
  component: Component | string,
  baseUrl: string
): string {
  if (typeof component === 'string') {
    component = { name: component };
  }

  let componentUrl = url.resolve(baseUrl, component.name);

  if (component.version) {
    componentUrl += '/' + component.version;
  }

  componentUrl += queryString(component.parameters);

  return componentUrl;
}
export function componentInfo(component: Component, baseUrl: string): string {
  return componentForType(component, baseUrl, 'info');
}
export function componentPreview(
  component: Component,
  baseUrl: string
): string {
  let href = componentForType(component, baseUrl, 'preview');
  if (!!component.parameters && Object.keys(component.parameters).length) {
    href += '/?' + querystring.stringify(component.parameters);
  } else {
    href += '/';
  }

  return href;
}
export function queryString(parameters: Record<string, string> = {}): string {
  let qs = '';

  if (Object.keys(parameters).length > 0) {
    qs += '?';

    for (const [key, parameter] of Object.entries(parameters)) {
      qs += key + '=' + encodeURIComponent(parameter) + '&';
    }

    if (Object.keys(parameters).length > 0) {
      qs = qs.slice(0, -1);
    }
  }

  return qs;
}
