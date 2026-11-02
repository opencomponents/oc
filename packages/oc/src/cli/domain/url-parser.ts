import querystring from 'node:querystring';

const removeFinalSlashes = (s: string) => {
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
  const requestedVersion = parsed.requestVersion;
  const href = new URL(parsed.href);
  const relativePath = removeFinalSlashes(href.pathname);
  const withoutVersion = removeFinalSlashes(
    relativePath.replace(requestedVersion, '')
  );
  const componentName = withoutVersion.substr(
    withoutVersion.lastIndexOf('/') + 1
  );
  const withoutComponent = removeFinalSlashes(
    withoutVersion.replace(componentName, '')
  );
  const registryUrl = href.protocol + '//' + href.host + withoutComponent + '/';

  return {
    clientHref: registryUrl + 'oc-client/client.js',
    name: componentName,
    parameters: querystring.parse(href.search.slice(1)),
    registryUrl: registryUrl,
    version: requestedVersion
  };
}
