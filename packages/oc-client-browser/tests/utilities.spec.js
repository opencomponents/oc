import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : utility functions", () => {
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

	test("should handle addStylesToHead with multiple styles", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const initialStyleCount = document.head.querySelectorAll("style").length;

			oc.addStylesToHead(".test1 { color: red; }");
			oc.addStylesToHead(".test2 { color: blue; }");
			oc.addStylesToHead(".test3 { color: green; }");

			const finalStyleCount = document.head.querySelectorAll("style").length;
			const styles = Array.from(document.head.querySelectorAll("style"));
			const lastThreeStyles = styles.slice(-3);

			return {
				initialCount: initialStyleCount,
				finalCount: finalStyleCount,
				addedCount: finalStyleCount - initialStyleCount,
				lastThreeContents: lastThreeStyles.map((style) => style.textContent),
			};
		});

		expect(result.addedCount).toBe(3);
		expect(result.lastThreeContents).toEqual([
			".test1 { color: red; }",
			".test2 { color: blue; }",
			".test3 { color: green; }",
		]);
	});

	test("should handle addStylesToHead with empty styles", async ({ page }) => {
		const result = await page.evaluate(() => {
			const initialStyleCount = document.head.querySelectorAll("style").length;

			oc.addStylesToHead("");
			oc.addStylesToHead("   ");

			const finalStyleCount = document.head.querySelectorAll("style").length;
			const styles = Array.from(document.head.querySelectorAll("style"));
			const lastTwoStyles = styles.slice(-2);

			return {
				initialCount: initialStyleCount,
				finalCount: finalStyleCount,
				addedCount: finalStyleCount - initialStyleCount,
				lastTwoContents: lastTwoStyles.map((style) => style.textContent),
			};
		});

		expect(result.addedCount).toBe(2);
		expect(result.lastTwoContents).toEqual(["", "   "]);
	});

	test("should handle addStylesToHead with complex CSS", async ({ page }) => {
		const result = await page.evaluate(() => {
			const complexCSS = `
				.complex-selector > .child:nth-child(2n+1) {
					background: linear-gradient(45deg, #ff0000, #00ff00);
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
					transform: translateX(10px) rotate(5deg);
				}
				@media (max-width: 768px) {
					.responsive { display: none; }
				}
			`;

			const initialStyleCount = document.head.querySelectorAll("style").length;
			oc.addStylesToHead(complexCSS);
			const finalStyleCount = document.head.querySelectorAll("style").length;

			const lastStyle = Array.from(
				document.head.querySelectorAll("style"),
			).pop();

			return {
				addedCount: finalStyleCount - initialStyleCount,
				styleContent: lastStyle?.textContent,
				containsGradient: lastStyle?.textContent.includes("linear-gradient"),
				containsMediaQuery: lastStyle?.textContent.includes("@media"),
			};
		});

		expect(result.addedCount).toBe(1);
		expect(result.containsGradient).toBe(true);
		expect(result.containsMediaQuery).toBe(true);
	});

	test("should handle requireSeries with empty array", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				oc.requireSeries([], (loaded) => {
					resolve({
						callbackCalled: true,
						loadedArray: loaded,
						loadedLength: loaded?.length,
					});
				});
			});
		});

		expect(result.callbackCalled).toBe(true);
		expect(result.loadedArray).toEqual([]);
		expect(result.loadedLength).toBe(0);
	});

	test("should handle requireSeries with single item", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				window.TestSingleLib = { name: "single", loaded: true };

				const toLoad = [
					{
						global: "TestSingleLib",
						url: "data:application/javascript,window.TestSingleLib = window.TestSingleLib || { name: 'single', loaded: true };",
					},
				];

				oc.requireSeries(toLoad, (loaded) => {
					resolve({
						callbackCalled: true,
						loadedArray: loaded,
						loadedLength: loaded?.length,
						firstItem: loaded?.[0],
					});
				});
			});
		});

		expect(result.callbackCalled).toBe(true);
		expect(result.loadedLength).toBe(1);
		expect(result.firstItem).toEqual({ name: "single", loaded: true });
	});

	test("should handle requireSeries with multiple items", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				window.TestLib1 = { name: "lib1", version: "1.0" };
				window.TestLib2 = { name: "lib2", version: "2.0" };

				const toLoad = [
					{
						global: "TestLib1",
						url: "data:application/javascript,// lib1 loaded",
					},
					{
						global: "TestLib2",
						url: "data:application/javascript,// lib2 loaded",
					},
				];

				oc.requireSeries(toLoad, (loaded) => {
					resolve({
						callbackCalled: true,
						loadedArray: loaded,
						loadedLength: loaded?.length,
						lib1: loaded?.[0],
						lib2: loaded?.[1],
					});
				});
			});
		});

		expect(result.callbackCalled).toBe(true);
		expect(result.loadedLength).toBe(2);
		expect(result.lib1).toEqual({ name: "lib1", version: "1.0" });
		expect(result.lib2).toEqual({ name: "lib2", version: "2.0" });
	});
});
