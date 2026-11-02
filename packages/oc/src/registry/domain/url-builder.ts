import querystring from 'node:querystring';

type Component = {
  name: string;
  version?: string;
  parameters?: Record<string, string>;
};

const resolveUrl = (baseUrl: string, path: string): string => {
  const hasProtocol = /^[a-z][a-z\d+.-]*:/i;
  if (hasProtocol.test(baseUrl)) {
    return new URL(path, baseUrl).toString();
  }

  // WHATWG URLs need an absolute base; discard the synthetic origin afterward.
  const base = new URL(baseUrl, 'http://relative.invalid/');
  const resolved = new URL(path, base);
  if (hasProtocol.test(path)) {
    return resolved.toString();
  }
  if (baseUrl.startsWith('//') || path.startsWith('//')) {
    return resolved.toString().slice(resolved.protocol.length);
  }

  const relative = resolved.pathname + resolved.search + resolved.hash;
  return baseUrl.startsWith('/') || path.startsWith('/')
    ? relative
    : relative.slice(1);
};

function componentForType(
  component: Component | string,
  baseUrl: string,
  type: string
): string {
  if (typeof component === 'string') {
    component = { name: component };
  }

  let href = resolveUrl(baseUrl, component.name) + '/';

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

  let componentUrl = resolveUrl(baseUrl, component.name);

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
  if (component.parameters && Object.keys(component.parameters).length) {
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
