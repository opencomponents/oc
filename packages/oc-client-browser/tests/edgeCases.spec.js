import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : edge cases", () => {
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

	test("should handle build with special characters in parameters", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const options = {
				baseUrl: "https://example.com",
				name: "test-component",
				version: "1.0.0",
				parameters: {
					message: "Hello & Welcome!",
					query: "search=test+value",
					encoded: "already%20encoded",
					symbols: "!@#$%^&*()",
				},
			};

			return {
				html: oc.build(options),
			};
		});

		expect(result.html).toContain("oc-component");
		expect(result.html).toContain("href=");
		expect(result.html).toContain("Hello%20%26%20Welcome!");
		expect(result.html).toContain("search%3Dtest%2Bvalue");
	});

	test("should handle build with empty parameters", async ({ page }) => {
		const result = await page.evaluate(() => {
			const options = {
				baseUrl: "https://example.com",
				name: "test-component",
				version: "1.0.0",
				parameters: {},
			};

			return {
				html: oc.build(options),
			};
		});

		expect(result.html).toContain("oc-component");
		expect(result.html).toContain("test-component/1.0.0/");
		expect(result.html).not.toContain("?");
	});

	test("should handle build without version", async ({ page }) => {
		const result = await page.evaluate(() => {
			const options = {
				baseUrl: "https://example.com",
				name: "test-component",
			};

			return {
				html: oc.build(options),
			};
		});

		expect(result.html).toContain("oc-component");
		expect(result.html).toContain("test-component/");
		expect(result.html).toContain('href="https://example.com/test-component/"');
	});

	test("should handle build with baseUrl having trailing slash", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const options1 = {
				baseUrl: "https://example.com/",
				name: "test-component",
				version: "1.0.0",
			};

			const options2 = {
				baseUrl: "https://example.com",
				name: "test-component",
				version: "1.0.0",
			};

			return {
				html1: oc.build(options1),
				html2: oc.build(options2),
			};
		});

		expect(result.html1).toContain("https://example.com/test-component/1.0.0/");
		expect(result.html2).toContain("https://example.com/test-component/1.0.0/");
		expect(result.html1).toBe(result.html2);
	});

	test("should handle renderNestedComponent with jQuery-like object", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const element = document.createElement("oc-component");
				element.setAttribute("href", "https://example.com/component");
				element.setAttribute("id", "test-component");
				document.body.appendChild(element);

				const jqueryLikeObject = [element];
				jqueryLikeObject[0] = element;

				let callbackCalled = false;

				oc.renderNestedComponent(jqueryLikeObject, () => {
					callbackCalled = true;
				});

				setTimeout(() => {
					resolve({
						callbackCalled,
						elementHasDataRendering: element.hasAttribute("data-rendering"),
						elementDataRendering: element.getAttribute("data-rendering"),
					});
				}, 100);
			});
		});

		expect(result.elementHasDataRendering).toBe(true);
		expect(result.elementDataRendering).toBe("true");
	});

	test("should handle renderNestedComponent with already rendered component", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const element = document.createElement("oc-component");
				element.setAttribute("href", "https://example.com/component");
				element.setAttribute("id", "test-component");
				element.setAttribute("data-rendered", "true");
				document.body.appendChild(element);

				let callbackCalled = false;
				const startTime = Date.now();

				oc.renderNestedComponent(element, () => {
					callbackCalled = true;
					const endTime = Date.now();
					resolve({
						callbackCalled,
						timeTaken: endTime - startTime,
						wasDelayed: endTime - startTime >= 400,
					});
				});
			});
		});

		expect(result.callbackCalled).toBe(true);
		expect(result.wasDelayed).toBe(false);
	});

	test("should handle renderNestedComponent with currently rendering component", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const element = document.createElement("oc-component");
				element.setAttribute("href", "https://example.com/component");
				element.setAttribute("id", "test-component");
				element.setAttribute("data-rendering", "true");
				document.body.appendChild(element);

				let callbackCalled = false;
				const startTime = Date.now();

				oc.renderNestedComponent(element, () => {
					callbackCalled = true;
					const endTime = Date.now();
					resolve({
						callbackCalled,
						timeTaken: endTime - startTime,
						wasDelayed: endTime - startTime >= 400,
					});
				});

				setTimeout(() => {
					element.setAttribute("data-rendering", "false");
					element.setAttribute("data-rendered", "true");
				}, 200);
			});
		});

		expect(result.callbackCalled).toBe(true);
		expect(result.wasDelayed).toBe(true);
	});

	test("should handle getAction with missing component", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				oc.getAction({ component: "non-existent-component" })
					.then((props) => {
						resolve({
							success: true,
							props: props,
						});
					})
					.catch((error) => {
						resolve({
							success: false,
							error: error.message || error,
						});
					});
			});
		});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	test("should handle multiple rapid renderUnloadedComponents calls", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const component1 = document.createElement("oc-component");
				component1.setAttribute("href", "https://example.com/component1");
				component1.setAttribute("id", "component1");
				document.body.appendChild(component1);

				const component2 = document.createElement("oc-component");
				component2.setAttribute("href", "https://example.com/component2");
				component2.setAttribute("id", "component2");
				document.body.appendChild(component2);

				let renderCallCount = 0;
				const originalRenderNestedComponent = oc.renderNestedComponent;

				oc.renderNestedComponent = (component, callback) => {
					renderCallCount++;
					component.setAttribute("data-rendered", "true");
					callback();
				};

				oc.renderUnloadedComponents();

				setTimeout(() => {
					oc.renderNestedComponent = originalRenderNestedComponent;
					resolve({
						renderCallCount,
						component1HasDataRendered: component1.hasAttribute("data-rendered"),
						component2HasDataRendered: component2.hasAttribute("data-rendered"),
					});
				}, 100);
			});
		});

		expect(result.renderCallCount).toBeGreaterThan(0);
		expect(result.component1HasDataRendered).toBe(true);
		expect(result.component2HasDataRendered).toBe(true);
	});
});
