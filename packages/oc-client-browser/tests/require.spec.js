import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : require", () => {
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
			delete window.TestLibrary;
			delete window.MyNamespace;
		});
	});

	test("should require library with namespace", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const libraryScript = `
					window.TestLibrary = {
						version: '1.0.0',
						utils: {
							format: (str) => str.toUpperCase()
						}
					};
				`;
				const blob = new Blob([libraryScript], {
					type: "application/javascript",
				});
				const url = URL.createObjectURL(blob);

				oc.require("TestLibrary", url, (lib) => {
					resolve({
						libraryLoaded: !!lib,
						version: lib?.version,
						utilsAvailable: typeof lib?.utils?.format === "function",
						formatResult: lib?.utils?.format("hello"),
					});
				});
			});
		});

		expect(result.libraryLoaded).toBe(true);
		expect(result.version).toBe("1.0.0");
		expect(result.utilsAvailable).toBe(true);
		expect(result.formatResult).toBe("HELLO");
	});

	test("should require library with nested namespace", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const libraryScript = `
					window.MyNamespace = window.MyNamespace || {};
					window.MyNamespace.SubModule = {
						data: { test: true },
						methods: {
							getValue: () => 'nested-value'
						}
					};
				`;
				const blob = new Blob([libraryScript], {
					type: "application/javascript",
				});
				const url = URL.createObjectURL(blob);

				oc.require(["MyNamespace", "SubModule"], url, (subModule) => {
					resolve({
						subModuleLoaded: !!subModule,
						hasData: !!subModule?.data,
						testValue: subModule?.data?.test,
						methodResult: subModule?.methods?.getValue(),
					});
				});
			});
		});

		expect(result.subModuleLoaded).toBe(true);
		expect(result.hasData).toBe(true);
		expect(result.testValue).toBe(true);
		expect(result.methodResult).toBe("nested-value");
	});

	test("should handle require without namespace", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const libraryScript = `
					window.globalLibraryLoaded = true;
					window.globalLibraryData = { timestamp: Date.now() };
				`;
				const blob = new Blob([libraryScript], {
					type: "application/javascript",
				});
				const url = URL.createObjectURL(blob);

				oc.require(url, (result) => {
					resolve({
						callbackCalled: true,
						resultIsUndefined: result === undefined,
						globalLibraryLoaded: !!window.globalLibraryLoaded,
						globalDataExists: !!window.globalLibraryData,
					});
				});
			});
		});

		expect(result.callbackCalled).toBe(true);
		expect(result.resultIsUndefined).toBe(true);
		expect(result.globalLibraryLoaded).toBe(true);
		expect(result.globalDataExists).toBe(true);
	});

	test("should not reload already available library", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				window.TestLibrary = {
					loadCount: 1,
					increment: function () {
						this.loadCount++;
					},
				};

				const libraryScript = `
					if (window.TestLibrary) {
						window.TestLibrary.increment();
					}
				`;
				const blob = new Blob([libraryScript], {
					type: "application/javascript",
				});
				const url = URL.createObjectURL(blob);

				oc.require("TestLibrary", url, (lib) => {
					resolve({
						libraryLoaded: !!lib,
						loadCount: lib?.loadCount,
					});
				});
			});
		});

		expect(result.libraryLoaded).toBe(true);
		expect(result.loadCount).toBe(1);
	});

	test("should handle missing namespace gracefully", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const libraryScript = `
					window.SomeOtherLibrary = { loaded: true };
				`;
				const blob = new Blob([libraryScript], {
					type: "application/javascript",
				});
				const url = URL.createObjectURL(blob);

				oc.require("NonExistentLibrary", url, (lib) => {
					resolve({
						libraryLoaded: !!lib,
						isUndefined: lib === undefined,
						otherLibraryExists: !!window.SomeOtherLibrary,
					});
				});
			});
		});

		expect(result.libraryLoaded).toBe(false);
		expect(result.isUndefined).toBe(true);
		expect(result.otherLibraryExists).toBe(true);
	});
});
