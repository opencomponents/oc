import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : custom elements lifecycle", () => {
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

	test("should handle connectedCallback with lifecycle enabled", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let renderNestedCalled = false;
				const originalRenderNested = oc.renderNestedComponent;

				oc.renderNestedComponent = (component, callback) => {
					renderNestedCalled = true;
					callback();
				};

				const component = document.createElement("oc-component");
				component.setAttribute("href", "https://example.com/component");

				document.body.appendChild(component);

				setTimeout(() => {
					oc.renderNestedComponent = originalRenderNested;
					resolve({
						renderNestedCalled,
						isConnected: component.isConnected,
					});
				}, 100);
			});
		});

		expect(result.renderNestedCalled).toBe(true);
		expect(result.isConnected).toBe(true);
	});

	test("should handle connectedCallback with lifecycle disabled via attribute", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let renderNestedCalled = false;
				const originalRenderNested = oc.renderNestedComponent;

				oc.renderNestedComponent = (component, callback) => {
					renderNestedCalled = true;
					callback();
				};

				const component = document.createElement("oc-component");
				component.setAttribute("href", "https://example.com/component");
				component.setAttribute("disable-lifecycle", "true");

				document.body.appendChild(component);

				setTimeout(() => {
					oc.renderNestedComponent = originalRenderNested;
					resolve({
						renderNestedCalled,
						disableLifecycleAttr: component.getAttribute("disable-lifecycle"),
					});
				}, 100);
			});
		});

		expect(result.renderNestedCalled).toBe(false);
		expect(result.disableLifecycleAttr).toBe("true");
	});

	test("should handle disconnectedCallback and fire unrendered event", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let unrenderedEventFired = false;
				let eventData = null;

				oc.events.on("oc:unrendered", (e, data) => {
					unrenderedEventFired = true;
					eventData = data;
				});

				const component = document.createElement("oc-component");
				component.setAttribute("href", "https://example.com/component");
				component.setAttribute("id", "test-component-123");
				component.setAttribute("data-rendered", "true");

				document.body.appendChild(component);

				setTimeout(() => {
					component.remove();

					setTimeout(() => {
						resolve({
							unrenderedEventFired,
							eventElementId: eventData?.id,
							eventElement: eventData?.element === component,
						});
					}, 50);
				}, 50);
			});
		});

		expect(result.unrenderedEventFired).toBe(true);
		expect(result.eventElementId).toBe("test-component-123");
		expect(result.eventElement).toBe(true);
	});

	test("should call unmount method when component is disconnected", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let unmountCalled = false;

				const component = document.createElement("oc-component");
				component.setAttribute("href", "https://example.com/component");
				component.setAttribute("id", "test-component-456");
				component.setAttribute("data-rendered", "true");

				component.unmount = () => {
					unmountCalled = true;
				};

				document.body.appendChild(component);

				setTimeout(() => {
					component.remove();

					setTimeout(() => {
						resolve({
							unmountCalled,
							hasDataRendered: component.hasAttribute("data-rendered"),
						});
					}, 50);
				}, 50);
			});
		});

		expect(result.unmountCalled).toBe(true);
		expect(result.hasDataRendered).toBe(false);
	});

	test("should handle disable-lifecycle attribute variations", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let renderCalls = 0;
				const originalRenderNested = oc.renderNestedComponent;

				oc.renderNestedComponent = (component, callback) => {
					renderCalls++;
					callback();
				};

				const component1 = document.createElement("oc-component");
				component1.setAttribute("disable-lifecycle", "");
				document.body.appendChild(component1);

				const component2 = document.createElement("oc-component");
				component2.setAttribute("disable-lifecycle", "false");
				document.body.appendChild(component2);

				setTimeout(() => {
					oc.renderNestedComponent = originalRenderNested;
					resolve({
						renderCalls,
						component1DisableAttr: component1.getAttribute("disable-lifecycle"),
						component2DisableAttr: component2.getAttribute("disable-lifecycle"),
					});
				}, 100);
			});
		});

		expect(result.renderCalls).toBe(1);
		expect(result.component1DisableAttr).toBe("");
		expect(result.component2DisableAttr).toBe("false");
	});

	test("should not call unmount if component was never rendered", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let unmountCalled = false;

				const component = document.createElement("oc-component");
				component.setAttribute("href", "https://example.com/component");
				component.setAttribute("id", "test-component-789");

				component.unmount = () => {
					unmountCalled = true;
				};

				document.body.appendChild(component);

				setTimeout(() => {
					component.remove();

					setTimeout(() => {
						resolve({
							unmountCalled,
							hasDataRendered: component.hasAttribute("data-rendered"),
						});
					}, 50);
				}, 50);
			});
		});

		expect(result.unmountCalled).toBe(false);
		expect(result.hasDataRendered).toBe(false);
	});

	test("should handle multiple connect/disconnect cycles", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let renderCalls = 0;
				let unmountCalls = 0;
				const originalRenderNested = oc.renderNestedComponent;

				oc.renderNestedComponent = (component, callback) => {
					renderCalls++;
					component.setAttribute("data-rendered", "true");
					callback();
				};

				const component = document.createElement("oc-component");
				component.setAttribute("href", "https://example.com/component");
				component.setAttribute("id", "test-component-cycle");

				component.unmount = () => {
					unmountCalls++;
				};

				document.body.appendChild(component);

				setTimeout(() => {
					component.remove();

					setTimeout(() => {
						document.body.appendChild(component);

						setTimeout(() => {
							component.remove();

							setTimeout(() => {
								oc.renderNestedComponent = originalRenderNested;
								resolve({
									renderCalls,
									unmountCalls,
								});
							}, 50);
						}, 50);
					}, 50);
				}, 50);
			});
		});

		expect(result.renderCalls).toBe(2);
		expect(result.unmountCalls).toBe(2);
	});
});
