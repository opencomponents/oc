import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : registerTemplates", () => {
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

	test("should register single template", async ({ page }) => {
		const result = await page.evaluate(() => {
			const template = {
				type: "custom-template",
				externals: ["https://example.com/custom-lib.js"],
			};

			const registeredTemplates = oc.registerTemplates(template);

			return {
				templateRegistered: !!registeredTemplates["custom-template"],
				externals: registeredTemplates["custom-template"]?.externals,
				templateCount: Object.keys(registeredTemplates).length,
			};
		});

		expect(result.templateRegistered).toBe(true);
		expect(result.externals).toEqual(["https://example.com/custom-lib.js"]);
		expect(result.templateCount).toBeGreaterThan(0);
	});

	test("should register multiple templates", async ({ page }) => {
		const result = await page.evaluate(() => {
			const templates = [
				{
					type: "template-one",
					externals: ["https://example.com/lib1.js"],
				},
				{
					type: "template-two",
					externals: [
						"https://example.com/lib2.js",
						"https://example.com/lib3.js",
					],
				},
			];

			const registeredTemplates = oc.registerTemplates(templates);

			return {
				template1Registered: !!registeredTemplates["template-one"],
				template2Registered: !!registeredTemplates["template-two"],
				template1Externals: registeredTemplates["template-one"]?.externals,
				template2Externals: registeredTemplates["template-two"]?.externals,
				totalTemplates: Object.keys(registeredTemplates).length,
			};
		});

		expect(result.template1Registered).toBe(true);
		expect(result.template2Registered).toBe(true);
		expect(result.template1Externals).toEqual(["https://example.com/lib1.js"]);
		expect(result.template2Externals).toEqual([
			"https://example.com/lib2.js",
			"https://example.com/lib3.js",
		]);
		expect(result.totalTemplates).toBeGreaterThan(1);
	});

	test("should not overwrite existing template by default", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const originalTemplate = {
				type: "existing-template",
				externals: ["https://example.com/original.js"],
			};

			const newTemplate = {
				type: "existing-template",
				externals: ["https://example.com/new.js"],
			};

			oc.registerTemplates(originalTemplate);
			const afterFirst = oc.registerTemplates(newTemplate);

			return {
				externalsAfterSecond: afterFirst["existing-template"]?.externals,
				isOriginalPreserved:
					JSON.stringify(afterFirst["existing-template"]?.externals) ===
					JSON.stringify(["https://example.com/original.js"]),
			};
		});

		expect(result.isOriginalPreserved).toBe(true);
		expect(result.externalsAfterSecond).toEqual([
			"https://example.com/original.js",
		]);
	});

	test("should handle template with no externals", async ({ page }) => {
		const result = await page.evaluate(() => {
			const template = {
				type: "no-externals-template",
			};

			const registeredTemplates = oc.registerTemplates(template);

			return {
				templateRegistered: !!registeredTemplates["no-externals-template"],
				externals: registeredTemplates["no-externals-template"]?.externals,
			};
		});

		expect(result.templateRegistered).toBe(true);
		expect(result.externals).toBeUndefined();
	});

	test("should handle empty template array", async ({ page }) => {
		const result = await page.evaluate(() => {
			const originalCount = Object.keys(oc.registerTemplates([])).length;
			const afterEmpty = oc.registerTemplates([]);
			const finalCount = Object.keys(afterEmpty).length;

			return {
				originalCount,
				finalCount,
				countsEqual: originalCount === finalCount,
			};
		});

		expect(result.countsEqual).toBe(true);
	});

	test("should return all registered templates", async ({ page }) => {
		const result = await page.evaluate(() => {
			const template1 = {
				type: "return-test-1",
				externals: ["lib1.js"],
			};

			const template2 = {
				type: "return-test-2",
				externals: ["lib2.js"],
			};

			oc.registerTemplates(template1);
			const allTemplates = oc.registerTemplates(template2);

			return {
				hasTemplate1: !!allTemplates["return-test-1"],
				hasTemplate2: !!allTemplates["return-test-2"],
				template1Externals: allTemplates["return-test-1"]?.externals,
				template2Externals: allTemplates["return-test-2"]?.externals,
				isObject: typeof allTemplates === "object",
			};
		});

		expect(result.hasTemplate1).toBe(true);
		expect(result.hasTemplate2).toBe(true);
		expect(result.template1Externals).toEqual(["lib1.js"]);
		expect(result.template2Externals).toEqual(["lib2.js"]);
		expect(result.isObject).toBe(true);
	});
});
