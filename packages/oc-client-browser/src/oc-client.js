/* globals __CLIENT_VERSION__, __REGISTERED_TEMPLATES_PLACEHOLDER__, __DEFAULT_RETRY_INTERVAL__, __DEFAULT_RETRY_LIMIT__, __DEFAULT_DISABLE_LOADER__, __DISABLE_LEGACY_TEMPLATES__, __EXTERNALS__, __IMPORTS__ */
import { decode } from "@rdevis/turbo-stream";

function createErrorFromObject(o) {
	const e = new Error(o.message || o);
	if (o.stack) e.stack = o.stack;
	return Object.assign(e, o.originalError, o);
}

export function createOc(oc) {
	// If oc client is already inside the page, we do nothing.
	if (oc.status) {
		return oc;
	}
	oc.status = "loading";
	oc.conf = oc.conf || {};
	oc.cmd = oc.cmd || [];
	oc.renderedComponents = oc.renderedComponents || {};
	oc.clientVersion = __CLIENT_VERSION__;

	let isRequired = (name, value) => {
		if (!value) {
			throw name + " parameter is required";
		}
	};

	// The code
	let $document = document;
	let $window = window;
	let noop = () => {};
	let initialised = false;
	let initialising = false;
	let retries = {};
	let isBool = (a) => typeof a == "boolean";
	let timeout = setTimeout;
	let ocCmd = oc.cmd;
	let ocConf = oc.conf;
	let renderedComponents = oc.renderedComponents;
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

	// Constants
	let RETRY_INTERVAL =
		ocConf.retryInterval || Number(__DEFAULT_RETRY_INTERVAL__);
	let RETRY_LIMIT = ocConf.retryLimit || Number(__DEFAULT_RETRY_LIMIT__);
	let DISABLE_LOADER = isBool(ocConf.disableLoader)
		? ocConf.disableLoader
		: __DEFAULT_DISABLE_LOADER__;
	let RETRY_SEND_NUMBER = ocConf.retrySendNumber || true;
	let POLLING_INTERVAL = ocConf.pollingInterval || 500;
	let OC_TAG = ocConf.tag || "oc-component";
	let DISABLE_LIFECYCLES = isBool(ocConf.disableLifecycles)
		? ocConf.disableLifecycles
		: false;
	let MESSAGES_ERRORS_HREF_MISSING = "Href parameter missing";
	let MESSAGES_ERRORS_RETRY_FAILED =
		"Failed to load % component " + RETRY_LIMIT + " times. Giving up";
	let MESSAGES_ERRORS_LOADING_COMPILED_VIEW = "Error getting compiled view: %";
	let MESSAGES_ERRORS_RENDERING = "Error rendering component: %, error: ";
	let MESSAGES_ERRORS_RETRIEVING =
		"Failed to retrieve the component. Retrying in " +
		RETRY_INTERVAL / 1000 +
		" seconds...";
	let MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED =
		'Error loading component: view engine "%" not supported';
	let MESSAGES_LOADING_COMPONENT = ocConf.loadingMessage || "";
	let MESSAGES_RENDERED = "Component '%' correctly rendered";
	let MESSAGES_RETRIEVING =
		"Unrendered component found. Trying to retrieve it...";
	let interpolate = (str, value) => str.replace("%", value);

	let registeredTemplates = __REGISTERED_TEMPLATES_PLACEHOLDER__;
	let externals = __EXTERNALS__;
	let imports = __IMPORTS__;

	let registerTemplates = (templates, overwrite) => {
		templates = Array.isArray(templates) ? templates : [templates];
		templates.map((template) => {
			if (overwrite || !registeredTemplates[template.type]) {
				registeredTemplates[template.type] = {
					externals: template.externals,
				};
			}
		});
	};

	if (ocConf.templates) {
		registerTemplates(ocConf.templates, true);
	}

	let retry = (component, cb, failedRetryCb) => {
		if (retries[component] == undefined) {
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
		return (
			href + (~href.indexOf("?") ? "&" : "?") + new URLSearchParams(parameters)
		);
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
			...(typeof globalHeaders == "function" ? globalHeaders() : globalHeaders),
		};
	};

	oc.addStylesToHead = (styles) => {
		let style = $document.createElement("style");
		style.textContent = styles;
		if (nonce) {
			style.setAttribute("nonce", nonce);
		}
		$document.head.appendChild(style);
	};

	let loadAfterReady = () => {
		oc.ready(oc.renderUnloadedComponents);
	};

	oc.registerTemplates = (templates) => {
		registerTemplates(templates);
		loadAfterReady();
		return registeredTemplates;
	};

	// A minimal require.js-ish that uses l.js
	oc.require = (nameSpace, url, callback) => {
		if (!callback) {
			callback = url;
			url = nameSpace;
			nameSpace = undefined;
		}

		if (typeof nameSpace == "string") {
			nameSpace = [nameSpace];
		}

		let getObj = () => {
			let base = $window;

			if (nameSpace == undefined) {
				return undefined;
			}

			for (let i in nameSpace) {
				base = base[nameSpace[i]];
				if (!base) {
					return undefined;
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
			oc.require(loading.global, loading.url, (resolved) => {
				asyncRequireForEach(toLoad.slice(1), loaded.concat(resolved), callback);
			});
		}
	};

	oc.requireSeries = asyncRequireForEach;

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
		// If the html contains <scripts> tags, innerHTML will not execute them.
		// So we need to do it manually.
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
			oc.events.fire("oc:rendered", { ...data, id: data.ocId });
		}

		callback();
	};

	let getData = (options, cb) => {
		cb = cb || noop;
		let version = options.version,
			baseUrl = options.baseUrl,
			name = options.name;
		isRequired("version", version);
		isRequired("baseUrl", baseUrl);
		isRequired("name", name);
		if (options.action) {
			baseUrl = `${baseUrl}~actions/${options.action}/${options.name}/${
				options.version || ""
			}`;
		}
		let parameters = { ...ocConf.globalParameters, ...options.parameters };
		let data = options.action
			? parameters
			: {
					components: [
						{
							action: options.action,
							name: name,
							version: version,
							parameters,
						},
					],
				};
		let headers = getHeaders();

		fetch(baseUrl, {
			method: "POST",
			headers: headers,
			body: JSON.stringify(data),
			signal: options.signal,
		})
			.then(handleFetchResponse)
			.then((apiResponse) => {
				if (!options.action) {
					let response = apiResponse[0].response;
					let err = response.error
						? createErrorFromObject(response.details || response.error)
						: null;
					cb(err, response.data, apiResponse[0]);
				} else {
					let err = apiResponse.error
						? createErrorFromObject(apiResponse.details || apiResponse.error)
						: null;
					cb(err, apiResponse.data);
				}
			})
			.catch(cb);
	};
	oc.getData = getData;
	oc.getAction = (options) => {
		return new Promise((resolve, reject) => {
			let name = options.component;
			getData(
				{
					json: true,
					name: name,
					...renderedComponents[name],
					...options,
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
				},
			);
		});
	};

	oc.build = (options) => {
		isRequired("baseUrl", options.baseUrl);
		isRequired("name", options.name);

		let withFinalSlash = (s) => {
			if (!s) return "";

			return s.match(/\/$/) ? s : s + "/";
		};

		let href =
			withFinalSlash(options.baseUrl) +
			withFinalSlash(options.name) +
			withFinalSlash(options.version);

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

	oc.ready = (callback) => {
		if (initialised) {
			callback();
		} else if (initialising) {
			ocCmd.push(callback);
		} else {
			initialising = true;

			let done = () => {
				initialised = true;
				initialising = false;

				oc.events = (() => {
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
											(cb) => cb !== handler,
										);
									} else {
										delete listeners[event];
									}
								}
							}
						},
						reset() {
							listeners = {};
						},
					};
				})();
				if (Object.keys(imports).length > 0) {
					$document.head.appendChild(
						Object.assign($document.createElement("script"), {
							type: "importmap",
							textContent: JSON.stringify({ imports }),
						}),
					);
				}

				callback();

				oc.events.fire("oc:ready", oc);
				oc.status = "ready";

				ocCmd.map((cmd) => {
					cmd(oc);
				});

				oc.cmd = {
					push: (f) => f(oc),
				};
			};

			oc.requireSeries(externals, done);
		}
	};

	const renderOc = (template, apiResponse, callback) => {
		const isEsm = !!apiResponse.data?.component?.esm;

		if (isEsm) {
			renderEsm(apiResponse.data, callback);
		} else {
			oc.render(template, apiResponse.data, callback);
		}
	};

	const renderEsm = async (data, callback) => {
		try {
			const { _staticPath, _componentName, _componentVersion } =
				data.component.props;
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

	oc.render = (compiledViewInfo, model, callback) => {
		oc.ready(() => {
			// TODO: integrate with oc-empty-response-handler module
			if (model && model.__oc_emptyResponse == true) {
				return callback(null, "");
			}

			let type = compiledViewInfo.type;
			if (!__DISABLE_LEGACY_TEMPLATES__) {
				if (type == "jade" || type == "handlebars") {
					type = "oc-template-" + type;
				}
			}
			let template = registeredTemplates[type];

			if (template) {
				oc.require(
					["oc", "components", compiledViewInfo.key],
					compiledViewInfo.src,
					(compiledView) => {
						if (!compiledView) {
							callback(
								interpolate(
									MESSAGES_ERRORS_LOADING_COMPILED_VIEW,
									compiledViewInfo.src,
								),
							);
						} else {
							asyncRequireForEach(template.externals, () => {
								try {
									callback(
										null,
										!__DISABLE_LEGACY_TEMPLATES__ &&
											type == "oc-template-handlebars"
											? $window.Handlebars.template(compiledView, [])(model)
											: compiledView(model),
									);
								} catch (e) {
									callback("" + e);
								}
							});
						}
					},
				);
			} else {
				callback(
					interpolate(
						MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED,
						compiledViewInfo.type,
					),
				);
			}
		});
	};

	oc.renderNestedComponent = (component, callback) => {
		oc.ready(() => {
			// If the component is a jQuery object, we need to get the first element
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
					oc.renderNestedComponent(component, callback);
				}, POLLING_INTERVAL);
				return;
			}

			logInfo(MESSAGES_RETRIEVING);
			setAttribute(dataRenderingAttribute, true);
			if (!DISABLE_LOADER) {
				component.innerHTML =
					'<div class="oc-loading">' + MESSAGES_LOADING_COMPONENT + "</div>";
			}

			oc.renderByHref(
				{
					href: getAttribute("href"),
					id: getAttribute("id"),
					element: component,
				},
				(err, data) => {
					if (err || !data) {
						setAttribute(dataRenderingAttribute, false);
						setAttribute(dataRenderedAttribute, false);
						setAttribute("data-failed", true);
						component.innerHTML = "";
						oc.events.fire("oc:failed", {
							originalError: err,
							data: data,
							component,
						});
						logError(err);
						callback();
					} else {
						processHtml(component, data, callback);
					}
				},
			);
		});
	};

	oc.renderByHref = (hrefOrOptions, retryNumberOrCallback, callback) => {
		callback = callback || retryNumberOrCallback;
		let ocId = Math.floor(Math.random() * 9999999999);
		let retryNumber = hrefOrOptions.retryNumber || +retryNumberOrCallback || 0;
		let href = hrefOrOptions.href || hrefOrOptions;
		let id = hrefOrOptions.id || ocId;
		let element = hrefOrOptions.element;

		oc.ready(() => {
			if (!href) {
				callback(MESSAGES_ERRORS_RENDERING + MESSAGES_ERRORS_HREF_MISSING);
			} else {
				fetch(
					addParametersToHref(href, {
						...ocConf.globalParameters,
						...(RETRY_SEND_NUMBER ? { __oc_Retry: retryNumber } : {}),
					}),
					{
						headers: getHeaders(),
					},
				)
					.then(handleFetchResponse)
					.then((apiResponse) => {
						if (apiResponse.error) {
							throw apiResponse;
						}

						let template = apiResponse.template;
						apiResponse.data.id = ocId;
						apiResponse.data.element = element;

						renderOc(template, apiResponse, (err, html) => {
							if (err) {
								callback(
									interpolate(MESSAGES_ERRORS_RENDERING, apiResponse.href) +
										err,
								);
							} else {
								logInfo(interpolate(MESSAGES_RENDERED, template.src));
								callback(null, {
									id: id,
									ocId: ocId,
									html: html,
									baseUrl: apiResponse.baseUrl,
									key: template.key,
									version: apiResponse.version,
									name: apiResponse.name,
								});
							}
						});
					})
					.catch((err) => {
						if (err && err.status == 429) {
							retries[href] = 0;
						}
						logError(MESSAGES_ERRORS_RETRIEVING);
						window.oc.events.fire("oc:error", err);
						retry(
							href,
							(requestNumber) => {
								oc.renderByHref(
									{
										href: href,
										retryNumber: requestNumber,
										id: id,
										element: element,
									},
									callback,
								);
							},
							() => {
								callback(interpolate(MESSAGES_ERRORS_RETRY_FAILED, href));
							},
						);
					});
			}
		});
	};

	oc.renderUnloadedComponents = () => {
		oc.ready(() => {
			let unloadedComponents = $document.querySelectorAll(
				`${OC_TAG}:not([data-rendered="true"]):not([data-failed="true"])`,
			);

			unloadedComponents.forEach((unloadedComponent, idx) => {
				oc.renderNestedComponent(unloadedComponent, () => {
					if (idx == unloadedComponents.length - 1) {
						oc.renderUnloadedComponents();
					}
				});
			});
		});
	};

	oc.load = (placeholder, href, callback) => {
		oc.ready(() => {
			callback = callback || noop;

			if (placeholder) {
				placeholder = placeholder[0] || placeholder;
				placeholder.innerHTML = "<" + OC_TAG + ' href="' + href + '" />';
				let newComponent = placeholder.querySelector(OC_TAG);
				oc.renderNestedComponent(newComponent, () => {
					callback(newComponent);
				});
			}
		});
	};
	// render the components
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

					if (
						this.getAttribute("disable-lifecycle") == "true" ||
						this.getAttribute("disable-lifecycle") == ""
					) {
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
										oc.renderNestedComponent(this, () => {});
										break;
									}
								}
							});
							observer.observe(this);
						} else {
							oc.renderNestedComponent(this, () => {});
						}
					}
				}

				disconnectedCallback() {
					if (this.#connected) {
						this.#connected = false;
						const id = this.getAttribute("id");
						if (id) {
							oc.events.fire("oc:unrendered", {
								element: this,
								id,
							});
						}
						const shouldUnmount =
							this.#manageLifecycle &&
							this.unmount &&
							this.getAttribute("data-rendered") == "true";
						if (shouldUnmount) {
							this.unmount();
							this.removeAttribute("data-rendered");
						}
					}
				}
			},
		);
	}

	return oc;
}
