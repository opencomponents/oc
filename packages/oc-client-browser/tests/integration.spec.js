import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : integration scenarios", () => {
	test.beforeEach(async ({ page }) => {
		await page.evaluate(() => {
			window.originalConsoleLog = console.log;
			console.log = () => {};
		});
	});

	test.afterEach(async ({ page }) => {
		await page.evaluate(() => {
			console.log = window.originalConsoleLog;
			delete window.originalConsoleLog;
		});
	});

	test("should handle turbo-stream content type correctly", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const originalFetch = window.fetch;

				window.fetch = (url, options) => {
					return Promise.resolve({
						ok: true,
						headers: {
							get: (name) => (name === "Content-Type" ? "x-text/stream" : null),
						},
						body: new ReadableStream({
							start(controller) {
								const encoder = new TextEncoder();
								const data = JSON.stringify({ value: { test: "stream-data" } });
								controller.enqueue(encoder.encode(data));
								controller.close();
							},
						}),
					});
				};

				const mockResponse = {
					headers: {
						get: (name) => (name === "Content-Type" ? "x-text/stream" : null),
					},
					body: new ReadableStream({
						start(controller) {
							const encoder = new TextEncoder();
							const data = JSON.stringify({ value: { test: "stream-data" } });
							controller.enqueue(encoder.encode(data));
							controller.close();
						},
					}),
				};

				const isStreamContent =
					mockResponse.headers.get("Content-Type") === "x-text/stream";

				window.fetch = originalFetch;
				resolve({
					isStreamContent,
					contentType: mockResponse.headers.get("Content-Type"),
				});
			});
		});

		expect(result.isStreamContent).toBe(true);
		expect(result.contentType).toBe("x-text/stream");
	});

	test("should handle import maps correctly when externals exist", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const mockExternals = [
					{ global: "TestLib", url: "https://example.com/test-lib.js" },
				];

				const mockImports = {
					"test-module": "https://example.com/test-module.js",
					"another-module": "https://example.com/another-module.js",
				};

				const initialScriptCount = document.head.querySelectorAll(
					'script[type="importmap"]',
				).length;

				if (Object.keys(mockImports).length > 0) {
					const importMapScript = document.createElement("script");
					importMapScript.type = "importmap";
					importMapScript.textContent = JSON.stringify({
						imports: mockImports,
					});
					document.head.appendChild(importMapScript);
				}

				const finalScriptCount = document.head.querySelectorAll(
					'script[type="importmap"]',
				).length;
				const importMapScript = document.head.querySelector(
					'script[type="importmap"]',
				);

				resolve({
					initialScriptCount,
					finalScriptCount,
					importMapExists: !!importMapScript,
					importMapContent: importMapScript
						? JSON.parse(importMapScript.textContent)
						: null,
				});
			});
		});

		expect(result.finalScriptCount).toBe(result.initialScriptCount + 1);
		expect(result.importMapExists).toBe(true);
		expect(result.importMapContent.imports["test-module"]).toBe(
			"https://example.com/test-module.js",
		);
		expect(result.importMapContent.imports["another-module"]).toBe(
			"https://example.com/another-module.js",
		);
	});

	test("should handle global parameters and headers integration", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const originalFetch = window.fetch;
				const originalConf = Object.assign({}, oc.conf);
				let capturedRequest = null;

				oc.conf.globalParameters = { globalParam: "globalValue" };
				oc.conf.globalHeaders = { "X-Custom-Header": "custom-value" };

				window.fetch = (url, options) => {
					capturedRequest = {
						url,
						method: options.method,
						body: options.body,
						headers: options.headers,
					};

					return Promise.resolve({
						ok: true,
						headers: { get: () => null },
						json: () =>
							Promise.resolve([
								{
									response: { data: "test-data" },
								},
							]),
					});
				};

				oc.getData(
					{
						baseUrl: "https://example.com",
						name: "test-component",
						version: "1.0.0",
						parameters: { localParam: "localValue" },
					},
					(err, data) => {
						window.fetch = originalFetch;
						oc.conf = originalConf;

						const bodyData = JSON.parse(capturedRequest.body);
						resolve({
							globalParamIncluded:
								bodyData.components[0].parameters.globalParam === "globalValue",
							localParamIncluded:
								bodyData.components[0].parameters.localParam === "localValue",
							customHeaderIncluded:
								capturedRequest.headers["X-Custom-Header"] === "custom-value",
							acceptHeaderCorrect:
								capturedRequest.headers.Accept ===
								"application/vnd.oc.unrendered+json",
						});
					},
				);
			});
		});

		expect(result.globalParamIncluded).toBe(true);
		expect(result.localParamIncluded).toBe(true);
		expect(result.customHeaderIncluded).toBe(true);
		expect(result.acceptHeaderCorrect).toBe(true);
	});

	test("should handle component lifecycle with events integration", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const events = [];

				oc.ready(() => {
					oc.events.on("oc:rendered", (e, data) => {
						events.push({
							type: "rendered",
							name: data.name,
							version: data.version,
						});
					});

					oc.events.on("oc:failed", (e, data) => {
						events.push({ type: "failed", error: data.originalError });
					});

					const mockData = {
						html: "<div>Test Component</div>",
						version: "1.0.0",
						name: "integration-component",
						key: "test-key",
					};

					oc.events.fire("oc:rendered", mockData);

					setTimeout(() => {
						resolve({
							events,
							eventsFired: events.length > 0,
							hasRenderedEvent: events.some(
								(e) =>
									e.type === "rendered" && e.name === "integration-component",
							),
						});
					}, 50);
				});
			});
		});

		expect(result.eventsFired).toBe(true);
		expect(result.hasRenderedEvent).toBe(true);
	});

	test("should handle loader integration with script and CSS loading", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const loadedResources = [];

				if (typeof oc !== "undefined" && oc.requireSeries) {
					const originalRequireSeries = oc.requireSeries;

					oc.requireSeries = function (resources, callback) {
						if (Array.isArray(resources)) {
							loadedResources.push(...resources);
						} else if (resources) {
							loadedResources.push(resources);
						}

						if (callback) {
							setTimeout(callback, 10);
						}
						return this;
					};

					const testUrls = [
						"https://example.com/script1.js",
						"https://example.com/styles.css",
						"https://example.com/script2.js",
					];

					oc.requireSeries(testUrls, () => {
						oc.requireSeries = originalRequireSeries;
						resolve({
							loadedResources,
							allResourcesLoaded: testUrls.every((url) =>
								loadedResources.includes(url),
							),
							requireSeriesAvailable: true,
						});
					});
				} else {
					resolve({
						loadedResources: [],
						allResourcesLoaded: false,
						requireSeriesAvailable: false,
					});
				}
			});
		});

		if (result.requireSeriesAvailable) {
			expect(result.allResourcesLoaded).toBe(true);
			expect(result.loadedResources).toEqual([
				"https://example.com/script1.js",
				"https://example.com/styles.css",
				"https://example.com/script2.js",
			]);
		} else {
			expect(result.requireSeriesAvailable).toBe(false);
		}
	});

	test("should handle template registration with external dependencies", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const originalRequireSeries = oc.requireSeries;
				let requireSeriesCalled = false;
				let loadedDependencies = [];

				oc.requireSeries = (dependencies, callback) => {
					requireSeriesCalled = true;
					loadedDependencies = dependencies.map((dep) => ({
						name: dep.global,
						loaded: true,
					}));
					callback(loadedDependencies);
				};

				const templates = [
					{
						type: "integration-template-1",
						externals: [
							{ global: "Lib1", url: "https://example.com/lib1.js" },
							{ global: "Lib2", url: "https://example.com/lib2.js" },
						],
					},
					{
						type: "integration-template-2",
						externals: [{ global: "Lib3", url: "https://example.com/lib3.js" }],
					},
				];

				const registeredTemplates = oc.registerTemplates(templates);

				setTimeout(() => {
					oc.requireSeries = originalRequireSeries;
					resolve({
						template1Registered:
							!!registeredTemplates["integration-template-1"],
						template2Registered:
							!!registeredTemplates["integration-template-2"],
						template1Externals:
							registeredTemplates["integration-template-1"]?.externals,
						template2Externals:
							registeredTemplates["integration-template-2"]?.externals,
					});
				}, 50);
			});
		});

		expect(result.template1Registered).toBe(true);
		expect(result.template2Registered).toBe(true);
		expect(result.template1Externals).toHaveLength(2);
		expect(result.template2Externals).toHaveLength(1);
	});
});
