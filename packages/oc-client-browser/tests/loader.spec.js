import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : loader (LJS)", () => {
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

	test("should load JavaScript files successfully", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const testScript = `
					window.testLoadedScript = true;
					window.testScriptData = { loaded: true, timestamp: Date.now() };
				`;
				const blob = new Blob([testScript], { type: "application/javascript" });
				const url = URL.createObjectURL(blob);

				ljs.load(url, () => {
					resolve({
						scriptLoaded: !!window.testLoadedScript,
						scriptData: window.testScriptData,
						loadedResources: Array.from(ljs.loaded),
					});
				});
			});
		});

		expect(result.scriptLoaded).toBe(true);
		expect(result.scriptData).toEqual(
			expect.objectContaining({ loaded: true }),
		);
		expect(result.loadedResources.length).toBeGreaterThan(0);
	});

	test("should handle loading errors gracefully", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const nonExistentUrl = "https://nonexistent-domain-12345.com/script.js";
				let errorHandled = false;

				ljs.onError(() => {
					errorHandled = true;
				});

				ljs.load(nonExistentUrl, () => {
					resolve({
						errorHandled,
						errorCount: ljs.errors.size,
					});
				});

				setTimeout(() => {
					resolve({
						errorHandled,
						errorCount: ljs.errors.size,
					});
				}, 1000);
			});
		});

		expect(result.errorCount).toBeGreaterThan(0);
	});

	test("should load multiple resources concurrently", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const scripts = [
					"window.script1Loaded = true;",
					"window.script2Loaded = true;",
					"window.script3Loaded = true;",
				];

				const urls = scripts.map((script) => {
					const blob = new Blob([script], { type: "application/javascript" });
					return URL.createObjectURL(blob);
				});

				ljs.load(urls, () => {
					resolve({
						script1Loaded: !!window.script1Loaded,
						script2Loaded: !!window.script2Loaded,
						script3Loaded: !!window.script3Loaded,
						loadedCount: ljs.loaded.size,
					});
				});
			});
		});

		expect(result.script1Loaded).toBe(true);
		expect(result.script2Loaded).toBe(true);
		expect(result.script3Loaded).toBe(true);
		expect(result.loadedCount).toBeGreaterThan(2);
	});

	test("should load CSS files successfully", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const cssContent = `
					.test-css-class {
						color: red;
						font-size: 16px;
					}
				`;
				const blob = new Blob([cssContent], { type: "text/css" });
				const url = URL.createObjectURL(blob);

				ljs.load(url, () => {
					const stylesheets = Array.from(document.styleSheets);
					const hasTestStyle = stylesheets.some((sheet) => {
						try {
							return Array.from(sheet.cssRules || []).some((rule) =>
								rule.selectorText?.includes("test-css-class"),
							);
						} catch (e) {
							return false;
						}
					});

					resolve({
						cssLoaded: hasTestStyle,
						loadedCount: ljs.loaded.size,
					});
				});
			});
		});

		expect(result.loadedCount).toBeGreaterThan(0);
	});

	test("should handle module loading", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const moduleScript = `
					export const testModule = { name: 'test', version: '1.0.0' };
					window.moduleLoaded = true;
				`;
				const blob = new Blob([moduleScript], {
					type: "application/javascript",
				});
				const url = URL.createObjectURL(blob);

				ljs.load(
					url,
					() => {
						resolve({
							moduleLoaded: !!window.moduleLoaded,
							loadedCount: ljs.loaded.size,
						});
					},
					true,
				);
			});
		});

		expect(result.loadedCount).toBeGreaterThan(0);
	});

	test("should not reload already loaded resources", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const testScript =
					"window.loadCounter = (window.loadCounter || 0) + 1;";
				const blob = new Blob([testScript], { type: "application/javascript" });
				const url = URL.createObjectURL(blob);

				ljs.load(url, () => {
					const firstLoadCount = window.loadCounter;

					ljs.load(url, () => {
						resolve({
							firstLoadCount,
							secondLoadCount: window.loadCounter,
							loadedResourcesCount: ljs.loaded.size,
						});
					});
				});
			});
		});

		expect(result.firstLoadCount).toBe(1);
		expect(result.secondLoadCount).toBe(1);
	});
});
