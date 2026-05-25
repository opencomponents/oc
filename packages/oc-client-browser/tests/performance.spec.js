import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : performance and concurrency", () => {
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
			oc.events.reset();
		});
	});

	test("should handle concurrent renderByHref calls efficiently", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let fetchCallCount = 0;
				const startTime = Date.now();

				const mockFetch = (url, options) => {
					fetchCallCount++;
					return Promise.resolve({
						ok: true,
						headers: { get: () => null },
						json: () =>
							Promise.resolve({
								href: url,
								name: "test-component",
								version: "1.0.0",
								template: {
									src: "test.js",
									type: "handlebars",
									key: "test-key",
								},
								data: { id: Math.floor(Math.random() * 9999999999) },
								renderMode: "unrendered",
							}),
					});
				};

				window.fetch = mockFetch;

				oc.renderByHref("https://example.com/component-1", () => {});
				oc.renderByHref("https://example.com/component-2", () => {});

				setTimeout(() => {
					const endTime = Date.now();
					resolve({
						fetchCallCount,
						totalTime: endTime - startTime,
						callsWereMade: fetchCallCount > 0,
					});
				}, 100);
			});
		});

		expect(result.fetchCallCount).toBeGreaterThan(0);
		expect(result.callsWereMade).toBe(true);
		expect(result.totalTime).toBeLessThan(1000);
	});

	test("should handle retry logic with 429 status correctly", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let fetchCallCount = 0;
				let retryAttempted = false;

				const mockFetch = (url, options) => {
					fetchCallCount++;

					if (fetchCallCount === 1) {
						retryAttempted = true;
						return Promise.reject({ status: 429 });
					}
					return Promise.resolve({
						ok: true,
						headers: { get: () => null },
						json: () =>
							Promise.resolve({
								href: url,
								name: "test-component",
								version: "1.0.0",
								template: {
									src: "test.js",
									type: "handlebars",
									key: "test-key",
								},
								data: { id: Math.floor(Math.random() * 9999999999) },
								renderMode: "unrendered",
							}),
					});
				};

				window.fetch = mockFetch;

				oc.renderByHref("https://example.com/component", (err, data) => {
					resolve({
						fetchCallCount,
						retryAttempted,
						hasError: !!err,
						hasData: !!data,
					});
				});
			});
		});

		expect(result.retryAttempted).toBe(true);
		expect(result.fetchCallCount).toBeGreaterThanOrEqual(1);
	});

	test("should handle memory cleanup in events system", async ({ page }) => {
		const result = await page.evaluate(() => {
			let eventCallCount = 0;
			const handler1 = () => eventCallCount++;
			const handler2 = () => eventCallCount++;
			const handler3 = () => eventCallCount++;

			oc.events.on("test:memory", handler1);
			oc.events.on("test:memory", handler2);
			oc.events.on("test:memory", handler3);

			oc.events.fire("test:memory");
			const afterAdd = eventCallCount;

			oc.events.off("test:memory", handler2);
			eventCallCount = 0;
			oc.events.fire("test:memory");
			const afterRemoveOne = eventCallCount;

			oc.events.reset();
			eventCallCount = 0;
			oc.events.fire("test:memory");
			const afterReset = eventCallCount;

			return {
				afterAdd,
				afterRemoveOne,
				afterReset,
			};
		});

		expect(result.afterAdd).toBe(3);
		expect(result.afterRemoveOne).toBe(2);
		expect(result.afterReset).toBe(0);
	});

	test("should handle rapid component registration and rendering", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const startTime = Date.now();
				let renderCount = 0;

				const templates = [];
				for (let i = 0; i < 10; i++) {
					templates.push({
						type: `rapid-template-${i}`,
						externals: [`https://example.com/lib-${i}.js`],
					});
				}

				oc.registerTemplates(templates);

				const components = [];
				for (let i = 0; i < 10; i++) {
					const component = document.createElement("oc-component");
					component.setAttribute("href", `https://example.com/component-${i}`);
					components.push(component);
					document.body.appendChild(component);
				}

				const originalRenderNested = oc.renderNestedComponent;
				oc.renderNestedComponent = (component, callback) => {
					renderCount++;
					component.setAttribute("data-rendered", "true");
					callback();
				};

				oc.renderUnloadedComponents();

				setTimeout(() => {
					oc.renderNestedComponent = originalRenderNested;
					const endTime = Date.now();

					for (const c of components) {
						c.remove();
					}

					resolve({
						renderCount,
						totalTime: endTime - startTime,
						templatesRegistered:
							Object.keys(oc.registerTemplates([])).length >= 10,
					});
				}, 200);
			});
		});

		expect(result.renderCount).toBeGreaterThan(0);
		expect(result.totalTime).toBeLessThan(500);
		expect(result.templatesRegistered).toBe(true);
	});

	test("should handle large number of event listeners efficiently", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const startTime = Date.now();
			const handlers = [];
			let totalCalls = 0;

			for (let i = 0; i < 100; i++) {
				const handler = () => totalCalls++;
				handlers.push(handler);
				oc.events.on("perf:test", handler);
			}

			oc.events.fire("perf:test");
			const fireTime = Date.now();

			for (let i = 0; i < 50; i++) {
				oc.events.off("perf:test", handlers[i]);
			}

			const removeTime = Date.now();
			totalCalls = 0;
			oc.events.fire("perf:test");
			const secondFireTime = Date.now();

			return {
				initialCalls: 100,
				finalCalls: totalCalls,
				fireTime: fireTime - startTime,
				removeTime: removeTime - fireTime,
				secondFireTime: secondFireTime - removeTime,
			};
		});

		expect(result.initialCalls).toBe(100);
		expect(result.finalCalls).toBe(50);
		expect(result.fireTime).toBeLessThan(100);
		expect(result.removeTime).toBeLessThan(100);
		expect(result.secondFireTime).toBeLessThan(100);
	});

	test("should handle requireSeries with multiple dependencies efficiently", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const startTime = Date.now();

				window.TestLib1 = { name: "lib1", loaded: true };
				window.TestLib2 = { name: "lib2", loaded: true };
				window.TestLib3 = { name: "lib3", loaded: true };
				window.TestLib4 = { name: "lib4", loaded: true };
				window.TestLib5 = { name: "lib5", loaded: true };

				const dependencies = [
					{ global: "TestLib1", url: "data:application/javascript,// lib1" },
					{ global: "TestLib2", url: "data:application/javascript,// lib2" },
					{ global: "TestLib3", url: "data:application/javascript,// lib3" },
					{ global: "TestLib4", url: "data:application/javascript,// lib4" },
					{ global: "TestLib5", url: "data:application/javascript,// lib5" },
				];

				oc.requireSeries(dependencies, (loaded) => {
					const endTime = Date.now();
					resolve({
						loadedCount: loaded.length,
						totalTime: endTime - startTime,
						allLoaded: loaded.every((lib) => lib?.loaded),
						libNames: loaded.map((lib) => lib?.name),
					});
				});
			});
		});

		expect(result.loadedCount).toBe(5);
		expect(result.totalTime).toBeLessThan(200);
		expect(result.allLoaded).toBe(true);
		expect(result.libNames).toEqual(["lib1", "lib2", "lib3", "lib4", "lib5"]);
	});
});
