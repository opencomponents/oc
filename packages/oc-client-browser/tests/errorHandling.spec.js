import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : error handling", () => {
	test.beforeEach(async ({ page }) => {
		await page.evaluate(() => {
			window.originalConsoleLog = console.log;
			window.originalConsoleError = console.error;
			window.capturedLogs = [];
			window.capturedErrors = [];

			console.log = (...args) => {
				window.capturedLogs.push(args.join(" "));
			};
			console.error = (...args) => {
				window.capturedErrors.push(args.join(" "));
			};
		});
	});

	test.afterEach(async ({ page }) => {
		await page.evaluate(() => {
			console.log = window.originalConsoleLog;
			console.error = window.originalConsoleError;
			delete window.originalConsoleLog;
			delete window.originalConsoleError;
			delete window.capturedLogs;
			delete window.capturedErrors;
		});
	});

	test("should handle events.on without callback", async ({ page }) => {
		const result = await page.evaluate(() => {
			try {
				oc.events.on("test:event");
				return { success: true, error: null };
			} catch (error) {
				return { success: false, error: error.message };
			}
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe("Callback is required");
	});

	test("should handle events.off with string event", async ({ page }) => {
		const result = await page.evaluate(() => {
			let eventFired = false;
			const handler = () => {
				eventFired = true;
			};

			oc.events.on("test:remove", handler);
			oc.events.fire("test:remove");
			const firedAfterAdd = eventFired;

			eventFired = false;
			oc.events.off("test:remove", handler);
			oc.events.fire("test:remove");
			const firedAfterRemove = eventFired;

			return {
				firedAfterAdd,
				firedAfterRemove,
			};
		});

		expect(result.firedAfterAdd).toBe(true);
		expect(result.firedAfterRemove).toBe(false);
	});

	test("should handle events.off with array of events", async ({ page }) => {
		const result = await page.evaluate(() => {
			let event1Fired = false;
			let event2Fired = false;

			const handler1 = () => {
				event1Fired = true;
			};
			const handler2 = () => {
				event2Fired = true;
			};

			oc.events.on("test:event1", handler1);
			oc.events.on("test:event2", handler2);

			oc.events.fire("test:event1");
			oc.events.fire("test:event2");
			const bothFiredAfterAdd = event1Fired && event2Fired;

			event1Fired = false;
			event2Fired = false;

			oc.events.off(["test:event1", "test:event2"]);
			oc.events.fire("test:event1");
			oc.events.fire("test:event2");
			const bothFiredAfterRemove = event1Fired || event2Fired;

			return {
				bothFiredAfterAdd,
				bothFiredAfterRemove,
			};
		});

		expect(result.bothFiredAfterAdd).toBe(true);
		expect(result.bothFiredAfterRemove).toBe(false);
	});

	test("should handle events.off without handler (remove all)", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			let handler1Called = false;
			let handler2Called = false;

			const handler1 = () => {
				handler1Called = true;
			};
			const handler2 = () => {
				handler2Called = true;
			};

			oc.events.on("test:removeAll", handler1);
			oc.events.on("test:removeAll", handler2);

			oc.events.fire("test:removeAll");
			const bothCalledAfterAdd = handler1Called && handler2Called;

			handler1Called = false;
			handler2Called = false;

			oc.events.off("test:removeAll");
			oc.events.fire("test:removeAll");
			const anyCalledAfterRemove = handler1Called || handler2Called;

			return {
				bothCalledAfterAdd,
				anyCalledAfterRemove,
			};
		});

		expect(result.bothCalledAfterAdd).toBe(true);
		expect(result.anyCalledAfterRemove).toBe(false);
	});

	test("should handle render with unsupported template type", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const compiledViewInfo = {
					type: "unsupported-template-type",
					src: "https://example.com/template.js",
					key: "test-key",
				};

				oc.render(compiledViewInfo, { test: "data" }, (error, html) => {
					resolve({
						hasError: !!error,
						errorMessage: error,
						html: html,
					});
				});
			});
		});

		expect(result.hasError).toBe(true);
		expect(result.errorMessage).toContain("not supported");
		expect(result.errorMessage).toContain("unsupported-template-type");
		expect(result.html).toBeUndefined();
	});

	test("should handle render with empty response", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const compiledViewInfo = {
					type: "handlebars",
					src: "https://example.com/template.js",
					key: "test-key",
				};

				const model = {
					__oc_emptyResponse: true,
					test: "data",
				};

				oc.render(compiledViewInfo, model, (error, html) => {
					resolve({
						hasError: !!error,
						errorMessage: error,
						html: html,
					});
				});
			});
		});

		expect(result.hasError).toBe(false);
		expect(result.errorMessage).toBeNull();
		expect(result.html).toBe("");
	});

	test("should handle renderByHref with empty string href", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				oc.renderByHref("", (error, data) => {
					resolve({
						hasError: !!error,
						errorMessage: error,
						data: data,
					});
				});
			});
		});

		expect(result.hasError).toBe(true);
		expect(result.errorMessage).toContain("Href parameter missing");
		expect(result.data).toBeUndefined();
	});

	test("should handle load with null placeholder", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				let callbackCalled = false;

				oc.load(null, "https://example.com/component", () => {
					callbackCalled = true;
				});

				setTimeout(() => {
					resolve({
						callbackCalled,
					});
				}, 100);
			});
		});

		expect(result.callbackCalled).toBe(false);
	});
});
