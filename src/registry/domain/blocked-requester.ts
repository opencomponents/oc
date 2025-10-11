import httpModule from 'node:http';
import httpsModule from 'node:https';
import nodeStream from 'node:stream';

export function createBlockedRequester(
  { blacklist = [] }: { blacklist: string[] | ((url: string) => boolean) } = {
    blacklist: []
  }
) {
  if (!Array.isArray(blacklist))
    throw new TypeError('blacklist must be an array');
  // normalise to canonical origin strings
  const blocked = new Set(
    blacklist.map((u) => {
      const { protocol, hostname, port } = new URL(u);
      return protocol + '//' + hostname + (port ? ':' + port : '');
    })
  );
  function isBlocked(url: string) {
    if (blocked.size === 0) {
      return false;
    }
    const { hostname, port } = new URL(url);
    // Check both http and https versions since the blacklist might have either
    const httpVersion = 'http://' + hostname + (port ? ':' + port : '');
    const httpsVersion = 'https://' + hostname + (port ? ':' + port : '');
    return blocked.has(httpVersion) || blocked.has(httpsVersion);
  }
  function createPatchedHttpModule(
    mod: typeof httpModule | typeof httpsModule,
    proto: 'http' | 'https',
    globalPatch = false
  ) {
    const origRequest = mod.request;

    function guardedRequest(
      optionsOrURL: string | URL,
      options: any,
      cb?: any
    ) {
      let url: string;
      if (typeof optionsOrURL === 'string' || optionsOrURL instanceof URL) {
        url = String(optionsOrURL);
      } else {
        // reconstruct URL from components
        const { hostname, port, path } = optionsOrURL;
        url =
          proto + '://' + hostname + (port ? ':' + port : '') + (path || '/');
      }

      const shouldBlock =
        typeof blacklist === 'function' ? blacklist(url) : isBlocked(url);
      if (shouldBlock) {
        const err = new Error(
          'Network request to "' + url + '" is blocked by policy'
        );
        const fake = new nodeStream.PassThrough();
        process.nextTick(() => fake.emit('error', err));
        if (cb) {
          process.nextTick(() => cb(fake));
        }
        return fake;
      }
      return origRequest(optionsOrURL, options, cb);
    }
    const patchedModule = globalPatch ? mod : Object.create(mod);

    Object.defineProperty(patchedModule, 'request', {
      value: guardedRequest, // the new value
      writable: false, // read-only
      enumerable: true,
      configurable: false // lock the descriptor itself
    });
    Object.defineProperty(patchedModule, 'get', {
      value: (opts: any, cb: any) => {
        const r = guardedRequest(opts, cb);
        r.end();
        return r;
      }
    });
    return patchedModule;
  }
  /* ----------------------------------------------------------
   * 2.  Create patched fetch
   * -------------------------------------------------------- */
  const nativeFetch = globalThis.fetch;
  const blockedFetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const url = new URL(input instanceof Request ? input.url : input); // throws if not absolute
    if (isBlocked(url.href)) {
      throw new Error('fetch to "' + url.href + '" is blocked by policy');
    }
    return nativeFetch(input, init);
  };
  // Preserve the preconnect method if it exists
  if ('preconnect' in nativeFetch) {
    blockedFetch.preconnect = nativeFetch.preconnect;
  }

  return {
    fetch: blockedFetch,
    http: createPatchedHttpModule(httpModule, 'http'),
    https: createPatchedHttpModule(httpsModule, 'https'),
    patch: () => {
      globalThis.fetch = blockedFetch;
      createPatchedHttpModule(httpModule, 'http');
      createPatchedHttpModule(httpsModule, 'https');
    }
  };
}
