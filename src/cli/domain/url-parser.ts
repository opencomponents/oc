import querystring from 'querystring';
import url from 'url';

const removeFinalSlashes = function (s: string) {
  while (s.slice(-1) === '/') {
    s = s.slice(0, -1);
  }
  return s;
};

interface UrlParsed {
  clientHref: string;
  name: string;
  parameters: querystring.ParsedUrlQuery;
  registryUrl: string;
  version: string;
}

export function parse(parsed: {
  requestVersion: string;
  href: string;
}): UrlParsed {
  const requestedVersion = parsed.requestVersion,
    href = url.parse(parsed.href),
    relativePath = removeFinalSlashes(href.pathname || ''),
    withoutVersion = removeFinalSlashes(
      relativePath.replace(requestedVersion, '')
    ),
    componentName = withoutVersion.substr(withoutVersion.lastIndexOf('/') + 1),
    withoutComponent = removeFinalSlashes(
      withoutVersion.replace(componentName, '')
    ),
    registryUrl = href.protocol + '//' + href.host + withoutComponent + '/';

  return {
    clientHref: registryUrl + 'oc-client/client.js',
    name: componentName,
    parameters: querystring.parse(href.query || ''),
    registryUrl: registryUrl,
    version: requestedVersion
  };
}
