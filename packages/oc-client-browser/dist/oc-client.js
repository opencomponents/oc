/*! OpenComponents client v2.1.10 | (c) 2015-2026 OpenComponents community | https://github.com/opencomponents/oc-client-browser/tree/master/LICENSES */
(() => {
  // <define:__EXTERNALS__>
  var define_EXTERNALS_default = [];

  // <define:__IMPORTS__>
  var define_IMPORTS_default = {};

  // <define:__REGISTERED_TEMPLATES_PLACEHOLDER__>
  var define_REGISTERED_TEMPLATES_PLACEHOLDER_default = { "oc-template-handlebars": { externals: [{ global: "Handlebars", url: "https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.7/handlebars.runtime.min.js" }] }, "oc-template-jade": { externals: [{ global: "jade", url: "https://cdnjs.cloudflare.com/ajax/libs/jade/1.11.0/runtime.min.js" }] }, "oc-template-es6": { externals: [] } };

  // src/loader.js
  var LJS = class {
    loaded = /* @__PURE__ */ new Set();
    errors = /* @__PURE__ */ new Set();
    parse(url) {
      const [path, hash] = url.split("#");
      const isModule = path.startsWith("module:");
      const src = path.replace(/^module:/, "");
      const [fallback, id] = (hash?.split("=") || []).reduce(
        (a, p) => p.startsWith("=") ? [p.slice(1), a[1]] : [a[0], p],
        []
      );
      return { src, isModule, fallback, id };
    }
    async load(...args) {
      for (const arg of args) {
        Array.isArray(arg) ? await Promise.all(arg.map((a) => this._load(a))) : typeof arg === "function" ? await arg() : await this._load(arg);
      }
      return this;
    }
    async _load(url) {
      if (this.loaded.has(url)) return;
      try {
        url.endsWith(".css") ? await this.css(url) : await this.js(url);
        this.loaded.add(url);
      } catch (err) {
        for (const fn of this.errors) {
          fn(url);
        }
        throw err;
      }
    }
    js(url) {
      const { src, isModule, fallback } = this.parse(url);
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.type = isModule ? "module" : "text/javascript";
        script.src = src;
        script.onload = resolve;
        script.onerror = () => fallback ? this._load(fallback).then(resolve).catch(reject) : reject();
        document.head.append(script);
      });
    }
    css(url) {
      const { src } = this.parse(url);
      return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = src;
        link.onload = resolve;
        link.onerror = reject;
        document.head.append(link);
      });
    }
    onError(fn) {
      this.errors.add(fn);
      return this;
    }
  };

  // ../../node_modules/@rdevis/turbo-stream/dist/turbo-stream.mjs
  var HOLE = -1;
  var NAN = -2;
  var NEGATIVE_INFINITY = -3;
  var NEGATIVE_ZERO = -4;
  var NULL = -5;
  var POSITIVE_INFINITY = -6;
  var UNDEFINED = -7;
  var TYPE_BIGINT = "B";
  var TYPE_DATE = "D";
  var TYPE_ERROR = "E";
  var TYPE_MAP = "M";
  var TYPE_NULL_OBJECT = "N";
  var TYPE_PROMISE = "P";
  var TYPE_REGEXP = "R";
  var TYPE_SET = "S";
  var TYPE_SYMBOL = "Y";
  var TYPE_URL = "U";
  var TYPE_PREVIOUS_RESOLVED = "Z";
  var Deferred = class {
    promise;
    resolve;
    reject;
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  };
  function createLineSplittingTransform() {
    const decoder = new TextDecoder();
    let leftover = "";
    return new TransformStream({
      transform(chunk, controller) {
        const str = decoder.decode(chunk, { stream: true });
        const parts = (leftover + str).split("\n");
        leftover = parts.pop() || "";
        for (const part of parts) {
          controller.enqueue(part);
        }
      },
      flush(controller) {
        if (leftover) {
          controller.enqueue(leftover);
        }
      }
    });
  }
  var objectProtoNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
  var globalObj = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : void 0;
  function unflatten(parsed) {
    const { hydrated, values } = this;
    if (typeof parsed === "number")
      return hydrate.call(this, parsed);
    if (!Array.isArray(parsed) || !parsed.length)
      throw new SyntaxError();
    const startIndex = values.length;
    for (const value of parsed) {
      values.push(value);
    }
    hydrated.length = values.length;
    return hydrate.call(this, startIndex);
  }
  function hydrate(index) {
    const { hydrated, values, deferred, plugins } = this;
    let result;
    const stack = [
      [
        index,
        (v) => {
          result = v;
        }
      ]
    ];
    let postRun = [];
    while (stack.length > 0) {
      const [index2, set] = stack.pop();
      switch (index2) {
        case UNDEFINED:
          set(void 0);
          continue;
        case NULL:
          set(null);
          continue;
        case NAN:
          set(NaN);
          continue;
        case POSITIVE_INFINITY:
          set(Infinity);
          continue;
        case NEGATIVE_INFINITY:
          set(-Infinity);
          continue;
        case NEGATIVE_ZERO:
          set(-0);
          continue;
      }
      if (hydrated[index2]) {
        set(hydrated[index2]);
        continue;
      }
      const value = values[index2];
      if (!value || typeof value !== "object") {
        hydrated[index2] = value;
        set(value);
        continue;
      }
      if (Array.isArray(value)) {
        if (typeof value[0] === "string") {
          const [type, b, c] = value;
          switch (type) {
            case TYPE_DATE:
              set(hydrated[index2] = new Date(b));
              continue;
            case TYPE_URL:
              set(hydrated[index2] = new URL(b));
              continue;
            case TYPE_BIGINT:
              set(hydrated[index2] = BigInt(b));
              continue;
            case TYPE_REGEXP:
              set(hydrated[index2] = new RegExp(b, c));
              continue;
            case TYPE_SYMBOL:
              set(hydrated[index2] = Symbol.for(b));
              continue;
            case TYPE_SET:
              const newSet = /* @__PURE__ */ new Set();
              hydrated[index2] = newSet;
              for (let i = 1; i < value.length; i++)
                stack.push([
                  value[i],
                  (v) => {
                    newSet.add(v);
                  }
                ]);
              set(newSet);
              continue;
            case TYPE_MAP:
              const map = /* @__PURE__ */ new Map();
              hydrated[index2] = map;
              for (let i = 1; i < value.length; i += 2) {
                const r = [];
                stack.push([
                  value[i + 1],
                  (v) => {
                    r[1] = v;
                  }
                ]);
                stack.push([
                  value[i],
                  (k) => {
                    r[0] = k;
                  }
                ]);
                postRun.push(() => {
                  map.set(r[0], r[1]);
                });
              }
              set(map);
              continue;
            case TYPE_NULL_OBJECT:
              const obj = /* @__PURE__ */ Object.create(null);
              hydrated[index2] = obj;
              for (const key of Object.keys(b).reverse()) {
                const r = [];
                stack.push([
                  b[key],
                  (v) => {
                    r[1] = v;
                  }
                ]);
                stack.push([
                  Number(key.slice(1)),
                  (k) => {
                    r[0] = k;
                  }
                ]);
                postRun.push(() => {
                  obj[r[0]] = r[1];
                });
              }
              set(obj);
              continue;
            case TYPE_PROMISE:
              if (hydrated[b]) {
                set(hydrated[index2] = hydrated[b]);
              } else {
                const d = new Deferred();
                deferred[b] = d;
                set(hydrated[index2] = d.promise);
              }
              continue;
            case TYPE_ERROR:
              const [, message, errorType] = value;
              let error = errorType && globalObj && globalObj[errorType] ? new globalObj[errorType](message) : new Error(message);
              hydrated[index2] = error;
              set(error);
              continue;
            case TYPE_PREVIOUS_RESOLVED:
              set(hydrated[index2] = hydrated[b]);
              continue;
            default:
              if (Array.isArray(plugins)) {
                const r = [];
                const vals = value.slice(1);
                for (let i = 0; i < vals.length; i++) {
                  const v = vals[i];
                  stack.push([
                    v,
                    (v2) => {
                      r[i] = v2;
                    }
                  ]);
                }
                postRun.push(() => {
                  for (const plugin of plugins) {
                    const result2 = plugin(value[0], ...r);
                    if (result2) {
                      set(hydrated[index2] = result2.value);
                      return;
                    }
                  }
                  throw new SyntaxError();
                });
                continue;
              }
              throw new SyntaxError();
          }
        } else {
          const array = [];
          hydrated[index2] = array;
          for (let i = 0; i < value.length; i++) {
            const n = value[i];
            if (n !== HOLE) {
              stack.push([
                n,
                (v) => {
                  array[i] = v;
                }
              ]);
            }
          }
          set(array);
          continue;
        }
      } else {
        const object = {};
        hydrated[index2] = object;
        for (const key of Object.keys(value).reverse()) {
          const r = [];
          stack.push([
            value[key],
            (v) => {
              r[1] = v;
            }
          ]);
          stack.push([
            Number(key.slice(1)),
            (k) => {
              r[0] = k;
            }
          ]);
          postRun.push(() => {
            object[r[0]] = r[1];
          });
        }
        set(object);
        continue;
      }
    }
    while (postRun.length > 0) {
      postRun.pop()();
    }
    return result;
  }
  async function decode(readable, options) {
    const { plugins } = options ?? {};
    const done = new Deferred();
    const reader = readable.pipeThrough(createLineSplittingTransform()).getReader();
    const decoder = {
      values: [],
      hydrated: [],
      deferred: {},
      plugins
    };
    const decoded = await decodeInitial.call(decoder, reader);
    let donePromise = done.promise;
    if (decoded.done) {
      done.resolve();
    } else {
      donePromise = decodeDeferred.call(decoder, reader).then(done.resolve).catch((reason) => {
        for (const deferred of Object.values(decoder.deferred)) {
          deferred.reject(reason);
        }
        done.reject(reason);
      });
    }
    return {
      done: donePromise.then(() => reader.closed),
      value: decoded.value
    };
  }
  async function decodeInitial(reader) {
    const read = await reader.read();
    if (!read.value) {
      throw new SyntaxError();
    }
    let line;
    try {
      line = JSON.parse(read.value);
    } catch (reason) {
      throw new SyntaxError();
    }
    return {
      done: read.done,
      value: unflatten.call(this, line)
    };
  }
  async function decodeDeferred(reader) {
    let read = await reader.read();
    while (!read.done) {
      if (!read.value)
        continue;
      const line = read.value;
      switch (line[0]) {
        case TYPE_PROMISE: {
          const colonIndex = line.indexOf(":");
          const deferredId = Number(line.slice(1, colonIndex));
          const deferred = this.deferred[deferredId];
          if (!deferred) {
            throw new Error(`Deferred ID ${deferredId} not found in stream`);
          }
          const lineData = line.slice(colonIndex + 1);
          let jsonLine;
          try {
            jsonLine = JSON.parse(lineData);
          } catch (reason) {
            throw new SyntaxError();
          }
          const value = unflatten.call(this, jsonLine);
          deferred.resolve(value);
          break;
        }
        case TYPE_ERROR: {
          const colonIndex = line.indexOf(":");
          const deferredId = Number(line.slice(1, colonIndex));
          const deferred = this.deferred[deferredId];
          if (!deferred) {
            throw new Error(`Deferred ID ${deferredId} not found in stream`);
          }
          const lineData = line.slice(colonIndex + 1);
          let jsonLine;
          try {
            jsonLine = JSON.parse(lineData);
          } catch (reason) {
            throw new SyntaxError();
          }
          const value = unflatten.call(this, jsonLine);
          deferred.reject(value);
          break;
        }
        default:
          throw new SyntaxError();
      }
      read = await reader.read();
    }
  }

  // src/oc-client.js
  function createErrorFromObject(o) {
    const e = new Error(o.message || o);
    if (o.stack) e.stack = o.stack;
    return Object.assign(e, o.originalError, o);
  }
  function createOc(oc2) {
    if (oc2.status) {
      return oc2;
    }
    oc2.status = "loading";
    oc2.conf = oc2.conf || {};
    oc2.cmd = oc2.cmd || [];
    oc2.renderedComponents = oc2.renderedComponents || {};
    oc2.clientVersion = "2.1.10";
    let isRequired = (name, value) => {
      if (!value) {
        throw name + " parameter is required";
      }
    };
    let $document = document;
    let $window = window;
    let noop = () => {
    };
    let initialised = false;
    let initialising = false;
    let retries = {};
    let isBool = (a) => typeof a == "boolean";
    let timeout = setTimeout;
    let ocCmd = oc2.cmd;
    let ocConf = oc2.conf;
    let renderedComponents = oc2.renderedComponents;
    let dataRenderedAttribute = "data-rendered";
    let dataRenderingAttribute = "data-rendering";
    let nonce = $document.currentScript?.nonce;
    let logError = (msg) => console.log(msg);
    let logInfo = (msg) => ocConf.debug && console.log(msg);
    let handleFetchResponse = (response) => {
      if (response.headers.get("Content-Type") !== "x-text/stream")
        return response.json();
      return decode(response.body).then((decoded) => decoded.value);
    };
    let RETRY_INTERVAL = ocConf.retryInterval || Number(5e3);
    let RETRY_LIMIT = ocConf.retryLimit || Number(30);
    let DISABLE_LOADER = isBool(ocConf.disableLoader) ? ocConf.disableLoader : false;
    let RETRY_SEND_NUMBER = ocConf.retrySendNumber || true;
    let POLLING_INTERVAL = ocConf.pollingInterval || 500;
    let OC_TAG = ocConf.tag || "oc-component";
    let DISABLE_LIFECYCLES = isBool(ocConf.disableLifecycles) ? ocConf.disableLifecycles : false;
    let MESSAGES_ERRORS_HREF_MISSING = "Href parameter missing";
    let MESSAGES_ERRORS_RETRY_FAILED = "Failed to load % component " + RETRY_LIMIT + " times. Giving up";
    let MESSAGES_ERRORS_LOADING_COMPILED_VIEW = "Error getting compiled view: %";
    let MESSAGES_ERRORS_RENDERING = "Error rendering component: %, error: ";
    let MESSAGES_ERRORS_RETRIEVING = "Failed to retrieve the component. Retrying in " + RETRY_INTERVAL / 1e3 + " seconds...";
    let MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED = 'Error loading component: view engine "%" not supported';
    let MESSAGES_LOADING_COMPONENT = ocConf.loadingMessage || "";
    let MESSAGES_RENDERED = "Component '%' correctly rendered";
    let MESSAGES_RETRIEVING = "Unrendered component found. Trying to retrieve it...";
    let interpolate = (str, value) => str.replace("%", value);
    let registeredTemplates = define_REGISTERED_TEMPLATES_PLACEHOLDER_default;
    let externals = define_EXTERNALS_default;
    let imports = define_IMPORTS_default;
    let registerTemplates = (templates, overwrite) => {
      templates = Array.isArray(templates) ? templates : [templates];
      templates.map((template) => {
        if (overwrite || !registeredTemplates[template.type]) {
          registeredTemplates[template.type] = {
            externals: template.externals
          };
        }
      });
    };
    if (ocConf.templates) {
      registerTemplates(ocConf.templates, true);
    }
    let retry = (component, cb, failedRetryCb) => {
      if (retries[component] == void 0) {
        retries[component] = RETRY_LIMIT;
      }
      if (retries[component] <= 0) {
        failedRetryCb();
      } else {
        timeout(() => {
          cb(RETRY_LIMIT - retries[component] + 1);
        }, RETRY_INTERVAL);
        retries[component]--;
      }
    };
    let addParametersToHref = (href, parameters) => {
      return href + (~href.indexOf("?") ? "&" : "?") + new URLSearchParams(parameters);
    };
    let reanimateScripts = (component) => {
      for (let script of Array.from(component.querySelectorAll("script"))) {
        let newScript = $document.createElement("script");
        newScript.textContent = script.textContent;
        for (let attribute of Array.from(script.attributes)) {
          newScript.setAttribute(attribute.name, attribute.value);
        }
        if (nonce) {
          newScript.setAttribute("nonce", nonce);
        }
        script.parentNode?.replaceChild(newScript, script);
      }
    };
    let getHeaders = () => {
      let globalHeaders = ocConf.globalHeaders;
      return {
        Accept: "application/vnd.oc.unrendered+json",
        "Content-Type": "application/json",
        ...typeof globalHeaders == "function" ? globalHeaders() : globalHeaders
      };
    };
    oc2.addStylesToHead = (styles) => {
      let style = $document.createElement("style");
      style.textContent = styles;
      if (nonce) {
        style.setAttribute("nonce", nonce);
      }
      $document.head.appendChild(style);
    };
    let loadAfterReady = () => {
      oc2.ready(oc2.renderUnloadedComponents);
    };
    oc2.registerTemplates = (templates) => {
      registerTemplates(templates);
      loadAfterReady();
      return registeredTemplates;
    };
    oc2.require = (nameSpace, url, callback) => {
      if (!callback) {
        callback = url;
        url = nameSpace;
        nameSpace = void 0;
      }
      if (typeof nameSpace == "string") {
        nameSpace = [nameSpace];
      }
      let getObj = () => {
        let base = $window;
        if (nameSpace == void 0) {
          return void 0;
        }
        for (let i in nameSpace) {
          base = base[nameSpace[i]];
          if (!base) {
            return void 0;
          }
        }
        return base;
      };
      let cbGetObj = () => {
        callback(getObj());
      };
      if (!getObj()) {
        ljs.load(url, cbGetObj);
      } else {
        cbGetObj();
      }
    };
    let asyncRequireForEach = (toLoad, loaded, callback) => {
      if (!callback) {
        callback = loaded;
        loaded = [];
      }
      if (!toLoad.length) {
        callback(loaded);
      } else {
        let loading = toLoad[0];
        oc2.require(loading.global, loading.url, (resolved) => {
          asyncRequireForEach(toLoad.slice(1), loaded.concat(resolved), callback);
        });
      }
    };
    oc2.requireSeries = asyncRequireForEach;
    let processHtml = (component, data, callback) => {
      let setAttribute = component.setAttribute.bind(component);
      let dataName = data.name;
      let dataVersion = data.version;
      setAttribute("id", data.id);
      setAttribute(dataRenderedAttribute, true);
      setAttribute(dataRenderingAttribute, false);
      setAttribute("data-version", dataVersion);
      setAttribute("data-id", data.ocId);
      if (typeof data.html === "string") {
        component.innerHTML = data.html;
      }
      reanimateScripts(component);
      if (data.key) {
        setAttribute("data-hash", data.key);
      }
      if (dataName) {
        setAttribute("data-name", dataName);
        renderedComponents[dataName] = { version: dataVersion };
        if (data.baseUrl) {
          renderedComponents[dataName].baseUrl = data.baseUrl;
        }
        data.element = component;
        oc2.events.fire("oc:rendered", { ...data, id: data.ocId });
      }
      callback();
    };
    let getData = (options, cb) => {
      cb = cb || noop;
      let version = options.version, baseUrl = options.baseUrl, name = options.name;
      isRequired("version", version);
      isRequired("baseUrl", baseUrl);
      isRequired("name", name);
      if (options.action) {
        baseUrl = `${baseUrl}~actions/${options.action}/${options.name}/${options.version || ""}`;
      }
      let parameters = { ...ocConf.globalParameters, ...options.parameters };
      let data = options.action ? parameters : {
        components: [
          {
            action: options.action,
            name,
            version,
            parameters
          }
        ]
      };
      let headers = getHeaders();
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        signal: options.signal
      }).then(handleFetchResponse).then((apiResponse) => {
        if (!options.action) {
          let response = apiResponse[0].response;
          let err = response.error ? createErrorFromObject(response.details || response.error) : null;
          cb(err, response.data, apiResponse[0]);
        } else {
          let err = apiResponse.error ? createErrorFromObject(apiResponse.details || apiResponse.error) : null;
          cb(err, apiResponse.data);
        }
      }).catch(cb);
    };
    oc2.getData = getData;
    oc2.getAction = (options) => {
      return new Promise((resolve, reject) => {
        let name = options.component;
        getData(
          {
            json: true,
            name,
            ...renderedComponents[name],
            ...options
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              if (data.component) {
                let props = data.component.props;
                delete props._staticPath;
                delete props._baseUrl;
                delete props._componentName;
                delete props._componentVersion;
                resolve(props);
              } else {
                resolve();
              }
            }
          }
        );
      });
    };
    oc2.build = (options) => {
      isRequired("baseUrl", options.baseUrl);
      isRequired("name", options.name);
      let withFinalSlash = (s) => {
        if (!s) return "";
        return s.match(/\/$/) ? s : s + "/";
      };
      let href = withFinalSlash(options.baseUrl) + withFinalSlash(options.name) + withFinalSlash(options.version);
      if (options.parameters) {
        href += "?";
        for (let [key, value] of Object.entries(options.parameters)) {
          if (/[+&=]/.test(value)) {
            value = encodeURIComponent(value);
          }
          href += key + "=" + value + "&";
        }
        href = href.slice(0, -1);
      }
      return "<" + OC_TAG + ' href="' + href + '"></' + OC_TAG + ">";
    };
    oc2.ready = (callback) => {
      if (initialised) {
        callback();
      } else if (initialising) {
        ocCmd.push(callback);
      } else {
        initialising = true;
        let done = () => {
          initialised = true;
          initialising = false;
          oc2.events = /* @__PURE__ */ (() => {
            let listeners = {};
            return {
              fire(key, data) {
                logInfo(`OC event fired: "${key}"`);
                if (listeners[key]) {
                  for (let cb of listeners[key]) {
                    cb({ type: key }, data);
                  }
                }
              },
              on(key, cb) {
                if (!cb) {
                  throw new Error("Callback is required");
                }
                if (!listeners[key]) {
                  listeners[key] = [];
                }
                listeners[key].push(cb);
              },
              off(events, handler) {
                if (typeof events === "string") {
                  events = [events];
                }
                for (let event of events) {
                  if (listeners[event]) {
                    if (handler) {
                      listeners[event] = listeners[event].filter(
                        (cb) => cb !== handler
                      );
                    } else {
                      delete listeners[event];
                    }
                  }
                }
              },
              reset() {
                listeners = {};
              }
            };
          })();
          if (Object.keys(imports).length > 0) {
            $document.head.appendChild(
              Object.assign($document.createElement("script"), {
                type: "importmap",
                textContent: JSON.stringify({ imports })
              })
            );
          }
          callback();
          oc2.events.fire("oc:ready", oc2);
          oc2.status = "ready";
          ocCmd.map((cmd) => {
            cmd(oc2);
          });
          oc2.cmd = {
            push: (f) => f(oc2)
          };
        };
        oc2.requireSeries(externals, done);
      }
    };
    const renderOc = (template, apiResponse, callback) => {
      const isEsm = !!apiResponse.data?.component?.esm;
      if (isEsm) {
        renderEsm(apiResponse.data, callback);
      } else {
        oc2.render(template, apiResponse.data, callback);
      }
    };
    const renderEsm = async (data, callback) => {
      try {
        const { _staticPath, _componentName, _componentVersion } = data.component.props;
        window.oc._esm = window.oc._esm || {};
        window.oc._esm[`${_componentName}@${_componentVersion}`] = (args) => {
          return _staticPath + "public/" + args;
        };
        const { mount } = await import(data.component.src);
        let context = {};
        if (data.component.development)
          context.development = data.component.development;
        mount(data.element, data.component.props, context);
        callback(null);
      } catch (error) {
        console.error("Error rendering ESM component", error);
        callback(error);
      }
    };
    oc2.render = (compiledViewInfo, model, callback) => {
      oc2.ready(() => {
        if (model && model.__oc_emptyResponse == true) {
          return callback(null, "");
        }
        let type = compiledViewInfo.type;
        if (true) {
          if (type == "jade" || type == "handlebars") {
            type = "oc-template-" + type;
          }
        }
        let template = registeredTemplates[type];
        if (template) {
          oc2.require(
            ["oc", "components", compiledViewInfo.key],
            compiledViewInfo.src,
            (compiledView) => {
              if (!compiledView) {
                callback(
                  interpolate(
                    MESSAGES_ERRORS_LOADING_COMPILED_VIEW,
                    compiledViewInfo.src
                  )
                );
              } else {
                asyncRequireForEach(template.externals, () => {
                  try {
                    callback(
                      null,
                      type == "oc-template-handlebars" ? $window.Handlebars.template(compiledView, [])(model) : compiledView(model)
                    );
                  } catch (e) {
                    callback("" + e);
                  }
                });
              }
            }
          );
        } else {
          callback(
            interpolate(
              MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED,
              compiledViewInfo.type
            )
          );
        }
      });
    };
    oc2.renderNestedComponent = (component, callback) => {
      oc2.ready(() => {
        component = component[0] || component;
        let getAttribute = component.getAttribute.bind(component);
        let setAttribute = component.setAttribute.bind(component);
        let dataRendering = getAttribute(dataRenderingAttribute);
        let dataRendered = getAttribute(dataRenderedAttribute);
        let isRendering = dataRendering == "true";
        let isRendered = dataRendered == "true";
        if (isRendered) {
          callback();
          return;
        }
        if (isRendering) {
          timeout(() => {
            oc2.renderNestedComponent(component, callback);
          }, POLLING_INTERVAL);
          return;
        }
        logInfo(MESSAGES_RETRIEVING);
        setAttribute(dataRenderingAttribute, true);
        if (!DISABLE_LOADER) {
          component.innerHTML = '<div class="oc-loading">' + MESSAGES_LOADING_COMPONENT + "</div>";
        }
        oc2.renderByHref(
          {
            href: getAttribute("href"),
            id: getAttribute("id"),
            element: component
          },
          (err, data) => {
            if (err || !data) {
              setAttribute(dataRenderingAttribute, false);
              setAttribute(dataRenderedAttribute, false);
              setAttribute("data-failed", true);
              component.innerHTML = "";
              oc2.events.fire("oc:failed", {
                originalError: err,
                data,
                component
              });
              logError(err);
              callback();
            } else {
              processHtml(component, data, callback);
            }
          }
        );
      });
    };
    oc2.renderByHref = (hrefOrOptions, retryNumberOrCallback, callback) => {
      callback = callback || retryNumberOrCallback;
      let ocId = Math.floor(Math.random() * 9999999999);
      let retryNumber = hrefOrOptions.retryNumber || +retryNumberOrCallback || 0;
      let href = hrefOrOptions.href || hrefOrOptions;
      let id = hrefOrOptions.id || ocId;
      let element = hrefOrOptions.element;
      oc2.ready(() => {
        if (!href) {
          callback(MESSAGES_ERRORS_RENDERING + MESSAGES_ERRORS_HREF_MISSING);
        } else {
          fetch(
            addParametersToHref(href, {
              ...ocConf.globalParameters,
              ...RETRY_SEND_NUMBER ? { __oc_Retry: retryNumber } : {}
            }),
            {
              headers: getHeaders()
            }
          ).then(handleFetchResponse).then((apiResponse) => {
            if (apiResponse.error) {
              throw apiResponse;
            }
            let template = apiResponse.template;
            apiResponse.data.id = ocId;
            apiResponse.data.element = element;
            renderOc(template, apiResponse, (err, html) => {
              if (err) {
                callback(
                  interpolate(MESSAGES_ERRORS_RENDERING, apiResponse.href) + err
                );
              } else {
                logInfo(interpolate(MESSAGES_RENDERED, template.src));
                callback(null, {
                  id,
                  ocId,
                  html,
                  baseUrl: apiResponse.baseUrl,
                  key: template.key,
                  version: apiResponse.version,
                  name: apiResponse.name
                });
              }
            });
          }).catch((err) => {
            if (err && err.status == 429) {
              retries[href] = 0;
            }
            logError(MESSAGES_ERRORS_RETRIEVING);
            window.oc.events.fire("oc:error", err);
            retry(
              href,
              (requestNumber) => {
                oc2.renderByHref(
                  {
                    href,
                    retryNumber: requestNumber,
                    id,
                    element
                  },
                  callback
                );
              },
              () => {
                callback(interpolate(MESSAGES_ERRORS_RETRY_FAILED, href));
              }
            );
          });
        }
      });
    };
    oc2.renderUnloadedComponents = () => {
      oc2.ready(() => {
        let unloadedComponents = $document.querySelectorAll(
          `${OC_TAG}:not([data-rendered="true"]):not([data-failed="true"])`
        );
        unloadedComponents.forEach((unloadedComponent, idx) => {
          oc2.renderNestedComponent(unloadedComponent, () => {
            if (idx == unloadedComponents.length - 1) {
              oc2.renderUnloadedComponents();
            }
          });
        });
      });
    };
    oc2.load = (placeholder, href, callback) => {
      oc2.ready(() => {
        callback = callback || noop;
        if (placeholder) {
          placeholder = placeholder[0] || placeholder;
          placeholder.innerHTML = "<" + OC_TAG + ' href="' + href + '" />';
          let newComponent = placeholder.querySelector(OC_TAG);
          oc2.renderNestedComponent(newComponent, () => {
            callback(newComponent);
          });
        }
      });
    };
    loadAfterReady();
    if (window.customElements) {
      window.customElements.define(
        OC_TAG,
        class extends HTMLElement {
          #connected = false;
          #manageLifecycle = !DISABLE_LIFECYCLES;
          // biome-ignore lint/complexity/noUselessConstructor: <explanation>
          constructor() {
            super();
          }
          connectedCallback() {
            this.#connected = true;
            if (this.getAttribute("disable-lifecycle") == "true" || this.getAttribute("disable-lifecycle") == "") {
              this.#manageLifecycle = false;
            } else if (this.getAttribute("disable-lifecycle") == "false") {
              this.#manageLifecycle = true;
            }
            if (this.#manageLifecycle) {
              if (this.getAttribute("loading") === "lazy") {
                const observer = new IntersectionObserver((entries) => {
                  for (const entry of entries) {
                    if (entry.isIntersecting) {
                      observer.disconnect();
                      oc2.renderNestedComponent(this, () => {
                      });
                      break;
                    }
                  }
                });
                observer.observe(this);
              } else {
                oc2.renderNestedComponent(this, () => {
                });
              }
            }
          }
          disconnectedCallback() {
            if (this.#connected) {
              this.#connected = false;
              const id = this.getAttribute("id");
              if (id) {
                oc2.events.fire("oc:unrendered", {
                  element: this,
                  id
                });
              }
              const shouldUnmount = this.#manageLifecycle && this.unmount && this.getAttribute("data-rendered") == "true";
              if (shouldUnmount) {
                this.unmount();
                this.removeAttribute("data-rendered");
              }
            }
          }
        }
      );
    }
    return oc2;
  }

  // src/index.js
  var oc = window.oc || {};
  var ljs2 = new LJS();
  window.ljs = ljs2;
  window.oc = createOc(oc);
})();
