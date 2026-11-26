import { createRequire } from 'node:module';
import type { Template } from '../../types';
import BoundedCache from '../../utils/bounded-cache';

export type LinkedTemplateFn = (model: any) => string;
export type LinkTemplateSpec = (spec: any) => LinkedTemplateFn;

export interface LinkedTemplateCacheOptions {
  maxEntries?: number;
  link?: LinkTemplateSpec;
}

const DEFAULT_MAX_ENTRIES = 500;
const LINKED_CACHE_NAMESPACE = 'linked';
const wrappedTemplates = new WeakMap<object, Template>();

const loadHandlebarsLink = (): LinkTemplateSpec => {
  // Resolve handlebars through the installed oc-template-handlebars so the
  // link step always uses the exact runtime that template module renders with.
  const requireFromTemplate = createRequire(
    require.resolve('oc-template-handlebars/package.json')
  );
  const handlebars = requireFromTemplate('handlebars') as {
    template: LinkTemplateSpec;
  };
  return (spec: any) => handlebars.template(spec);
};

/**
 * Defensive cache around a template module's `render` for the template-link
 * step (precompiled spec -> executable template function).
 *
 * Upstream oc-template-handlebars/lib/render.js intends to cache the linked
 * template per key but never hits: `cache.set(cacheType, options.key)` omits
 * the value argument, so `cache.get` misses forever (and `linked` is never
 * assigned from the cached entry either). As a result every render re-runs
 * `utils.validator()` + `handlebars.template()`. This wrapper links once per
 * key registry-side, regardless of that bug. Do not fix node_modules here;
 * the upstream fix is `cache.set(cacheType, options.key, linked)`.
 *
 * Keying: `options.key` (the component template hashKey on the registry
 * render path) when present. Otherwise the spec object identity is used via
 * a WeakMap: precompiled specs contain functions, so a content hash would be
 * both expensive per render (JSON.stringify drops functions entirely, which
 * would also make it collision-prone) and unbounded. The WeakMap fallback is
 * exact, O(1), and GC-bounded.
 *
 * The keyed cache is LRU-bounded (default 500 entries) via BoundedCache.
 * Behaviour is fail-open: misses and uncacheable shapes delegate to the
 * wrapped module, preserving its validation and error semantics exactly, and
 * the cache is only populated after a successful upstream render.
 */
export default function withLinkedTemplateCache(
  template: Template,
  options: LinkedTemplateCacheOptions = {}
): Template {
  // Fail open for exotic template shapes (e.g. test doubles or partial
  // custom modules): without getInfo/render the wrapper cannot satisfy the
  // Template contract (oc-client's uniqTemplates reads getInfo().type), so
  // pass the module through unwrapped instead of breaking registration.
  // Checked before the WeakMap lookup, which would throw on non-object keys.
  if (
    typeof template?.getInfo !== 'function' ||
    typeof template?.render !== 'function'
  ) {
    return template;
  }

  const alreadyWrapped = wrappedTemplates.get(template);
  if (alreadyWrapped) {
    return alreadyWrapped;
  }

  const linkedByKey = new BoundedCache(
    options.maxEntries ?? DEFAULT_MAX_ENTRIES
  );
  const linkedBySpec = new WeakMap<object, LinkedTemplateFn>();
  const injectedLink = options.link;
  let defaultLink: LinkTemplateSpec | undefined;
  let linkUnavailable = false;

  const getLink = (): LinkTemplateSpec | undefined => {
    if (injectedLink) {
      return injectedLink;
    }
    if (linkUnavailable) {
      return undefined;
    }
    try {
      if (!defaultLink) {
        defaultLink = loadHandlebarsLink();
      }
      return defaultLink;
    } catch {
      linkUnavailable = true;
      return undefined;
    }
  };

  const linkSpec = (spec: object): LinkedTemplateFn | undefined => {
    const link = getLink();
    if (!link) {
      return undefined;
    }
    try {
      return link(spec);
    } catch {
      return undefined;
    }
  };

  const render: Template['render'] = (renderOptions, callback): void => {
    const spec = renderOptions?.template;
    const key = renderOptions?.key;

    if (spec === null || typeof spec !== 'object') {
      template.render(renderOptions, callback);
      return;
    }

    const stringKey = typeof key === 'string' ? key : undefined;
    const cached =
      stringKey !== undefined
        ? linkedByKey.get<LinkedTemplateFn>(LINKED_CACHE_NAMESPACE, stringKey)
        : linkedBySpec.get(spec);

    if (cached) {
      try {
        callback(null, cached(renderOptions?.model));
      } catch (error) {
        callback(error as Error, undefined as unknown as string);
      }
      return;
    }

    template.render(renderOptions, (err, html) => {
      if (!err) {
        const linked = linkSpec(spec);
        if (linked) {
          if (stringKey !== undefined) {
            linkedByKey.set(LINKED_CACHE_NAMESPACE, stringKey, linked);
          } else {
            linkedBySpec.set(spec, linked);
          }
        }
      }
      callback(err, html);
    });
  };

  const wrapped: Template = { ...template, render };
  wrappedTemplates.set(template, wrapped);
  return wrapped;
}
