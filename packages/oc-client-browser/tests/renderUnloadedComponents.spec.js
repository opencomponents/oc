/* globals window */
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : renderUnloadedComponents", () => {
	test.beforeEach(async ({ page }) => {
		// Set up the test environment with component data
		await page.evaluate(() => {
			// Component data
			window.aComponent = {
				response: {
					href: "http://my-registry.com/v3/a-component/1.2.X/?name=John",
					name: "a-component",
					type: "oc-component",
					version: "1.2.123",
					requestVersion: "1.2.X",
					data: {},
					template: {
						src: "https://my-cdn.com/components/a-component/1.2.123/template.js",
						type: "handlebars",
						key: "46ee85c314b371cac60471cef5b2e2e6c443dccf",
					},
					renderMode: "unrendered",
				},
				view: 'oc.components=oc.components||{},oc.components["46ee85c314b371cac60471cef5b2e2e6c443dccf"]={compiler:[7,">= 4.0.0"],main:function(){return"Hello world!"},useData:!0};',
			};

			window.anotherComponent = {
				response: {
					href: "http://my-registry.com/v3/another-component/1.X.X/",
					name: "another-component",
					type: "oc-component",
					version: "1.0.0",
					requestVersion: "1.X.X",
					data: {},
					template: {
						src: "https://my-cdn.com/components/another-component/1.0.0/template.js",
						type: "jade",
						key: "97f07144341a214735c4cec85b002c4c8f394455",
					},
					renderMode: "unrendered",
				},
				view: 'oc.components=oc.components||{},oc.components["97f07144341a214735c4cec85b002c4c8f394455"]=function(c){var o=[];return o.push("<div>this is a component</div>"),o.join("")};',
			};

			// Store original functions to restore later
			window.originalFetch = window.fetch;
			window.originalConsoleLog = console.log;
			window.originalLjsLoad = ljs.load;
		});
	});

	test.afterEach(async ({ page }) => {
		// Clean up after each test
		await page.evaluate(() => {
			// Restore original functions
			window.fetch = window.originalFetch;
			console.log = window.originalConsoleLog;
			ljs.load = window.originalLjsLoad;

			// Clean up oc state
			oc.events.reset();
			delete oc.components;
			oc.renderedComponents = {};

			// Remove components from DOM
			document.querySelector("oc-component").remove();

			// Clean up test variables
			delete window.aComponent;
			delete window.anotherComponent;
			delete window.originalFetch;
			delete window.originalConsoleLog;
			delete window.originalLjsLoad;
			delete window.eventData;
		});
	});

	test("should render all unloaded components and fire events correctly", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Mock fetch
				window.fetch = (url, options) => {
					const isAnother = url.indexOf("another") > 0;
					console.log("GET", url);

					// Create a response object that mimics fetch Response
					const mockResponse = {
						ok: true,
						headers: {
							get: () => null,
						},
						json: () =>
							Promise.resolve(
								(isAnother ? window.anotherComponent : window.aComponent)
									.response,
							),
					};

					return Promise.resolve(mockResponse);
				};

				// Mock ljs.load
				ljs.load = (url, cb) => {
					cb(null, "ok");
				};

				// Suppress console logs
				console.log = () => {};

				// Add components to the DOM
				const aComponentHtml = document.createElement("oc-component");
				aComponentHtml.setAttribute("href", window.aComponent.response.href);

				const anotherComponentHtml = document.createElement("oc-component");
				anotherComponentHtml.setAttribute(
					"href",
					window.anotherComponent.response.href,
				);

				const failedComponent = document.createElement("oc-component");
				failedComponent.setAttribute("href", "");
				failedComponent.setAttribute("data-failed", true);

				document.body.appendChild(aComponentHtml);
				document.body.appendChild(anotherComponentHtml);
				document.body.appendChild(failedComponent);

				// Register component views
				eval(window.aComponent.view);
				eval(window.anotherComponent.view);

				// Track rendered events
				window.eventData = [];
				oc.events.on("oc:rendered", (e, data) => {
					window.eventData.push(data);
					if (window.eventData.length === 2) {
						// Both components have been rendered
						resolve({
							eventCount: window.eventData.length,
							firstComponent: {
								name: window.eventData[0].name,
								version: window.eventData[0].version,
								html: window.eventData[0].element.innerHTML,
							},
							secondComponent: {
								name: window.eventData[1].name,
								version: window.eventData[1].version,
								html: window.eventData[1].element.innerHTML,
							},
						});
					}
				});

				// Call the function being tested
				oc.renderUnloadedComponents();
			});
		});

		// Verify the results
		expect(result.eventCount).toBe(2);

		// First component
		expect(result.firstComponent.name).toBe("a-component");
		expect(result.firstComponent.version).toBe("1.2.123");
		expect(result.firstComponent.html).toBe("Hello world!");

		// Second component
		expect(result.secondComponent.name).toBe("another-component");
		expect(result.secondComponent.version).toBe("1.0.0");
		expect(result.secondComponent.html).toBe("<div>this is a component</div>");
	});
});
