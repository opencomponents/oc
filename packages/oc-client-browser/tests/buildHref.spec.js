// @ts-check
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : build", () => {
	test("should throw when building a component without baseUrl", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			try {
				oc.build({ name: "someName" });
				return { success: true };
			} catch (error) {
				return { success: false, message: error.message || error };
			}
		});

		expect(result.success).toBeFalsy();
		expect(result.message).toEqual("baseUrl parameter is required");
	});

	test("should throw when building a component without name", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			try {
				oc.build({ baseUrl: "http://www.opencomponents.com" });
				return { success: true };
			} catch (error) {
				return { success: false, message: error.message || error };
			}
		});

		expect(result.success).toBeFalsy();
		expect(result.message).toEqual("name parameter is required");
	});

	test("should build with baseUrl and name parameters", async ({ page }) => {
		const result = await page.evaluate(() => {
			return oc.build({
				baseUrl: "http://www.components.com/v2",
				name: "myComponent",
			});
		});

		expect(result).toEqual(
			'<oc-component href="http://www.components.com/v2/myComponent/"></oc-component>',
		);
	});

	test("should handle trailing slash in baseUrl", async ({ page }) => {
		const result = await page.evaluate(() => {
			return oc.build({
				baseUrl: "http://www.components.com/v2/",
				name: "myComponent",
			});
		});

		expect(result).toEqual(
			'<oc-component href="http://www.components.com/v2/myComponent/"></oc-component>',
		);
	});

	test("should build with baseUrl, name, and parameters", async ({ page }) => {
		const result = await page.evaluate(() => {
			return oc.build({
				baseUrl: "http://www.components.com/v2",
				name: "myComponent",
				parameters: {
					hello: "world",
					integer: 123,
					boo: true,
				},
			});
		});

		const expectedHref =
			"http://www.components.com/v2/myComponent/?hello=world&integer=123&boo=true";
		const expected = `<oc-component href="${expectedHref}"></oc-component>`;
		expect(result).toEqual(expected);
	});

	test("should build with baseUrl, name, and version", async ({ page }) => {
		const result = await page.evaluate(() => {
			return oc.build({
				baseUrl: "http://www.components.com/v2",
				name: "myComponent",
				version: "1.0.X",
			});
		});

		const expectedHref = "http://www.components.com/v2/myComponent/1.0.X/";
		const expected = `<oc-component href="${expectedHref}"></oc-component>`;
		expect(result).toEqual(expected);
	});

	test("should build with baseUrl, name, parameters, and version", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return oc.build({
				baseUrl: "http://www.components.com/v2",
				name: "myComponent",
				parameters: {
					hello: "world",
					integer: 123,
					boo: true,
				},
				version: "1.2.3",
			});
		});

		const expectedHref =
			"http://www.components.com/v2/myComponent/1.2.3/?hello=world&integer=123&boo=true";
		const expected = `<oc-component href="${expectedHref}"></oc-component>`;
		expect(result).toEqual(expected);
	});

	test("should preserve special characters in parameter values", async ({
		page,
	}) => {
		const specialCharsResult = await page.evaluate(() => {
			return oc.build({
				baseUrl: "http://www.components.com/v2",
				name: "myComponent",
				parameters: {
					message1: "Jack&Jane",
					message2: "Jane+Joseph",
					message3: "Joseph=Joe",
					message4: "Jamie?James",
				},
			});
		});

		// Parse the querystring from the result
		const specialCharsQuerystring = await page.evaluate((result) => {
			const match = /href=".*?\?(.*?)"/.exec(result);
			return match ? match[1] : "";
		}, specialCharsResult);

		// Extract and check parameter values
		const parameters = await page.evaluate((querystring) => {
			// Simple querystring parser
			const params = {};
			const pairs = querystring.split("&");
			for (let i = 0; i < pairs.length; i++) {
				const pair = pairs[i].split("=");
				params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
			}
			return params;
		}, specialCharsQuerystring);

		expect(parameters.message1).toEqual("Jack&Jane");
		expect(parameters.message2).toEqual("Jane+Joseph");
		expect(parameters.message3).toEqual("Joseph=Joe");
		expect(parameters.message4).toEqual("Jamie?James");
	});

	test("should decode encoded characters in parameter values", async ({
		page,
	}) => {
		const encodedResult = await page.evaluate(() => {
			return oc.build({
				baseUrl: "http://www.components.com/v2",
				name: "myComponent",
				parameters: {
					gpid: "fhdDk612M4mjT70xkKCZRg%3d%3d",
				},
			});
		});

		// Parse the querystring from the result
		const encodedQuerystring = await page.evaluate((result) => {
			const match = /href=".*?\?(.*?)"/.exec(result);
			return match ? match[1] : "";
		}, encodedResult);

		// Extract and check parameter values
		const encodedParameters = await page.evaluate((querystring) => {
			// Simple querystring parser
			const params = {};
			const pairs = querystring.split("&");
			for (let i = 0; i < pairs.length; i++) {
				const pair = pairs[i].split("=");
				params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
			}
			return params;
		}, encodedQuerystring);

		expect(encodedParameters.gpid).toEqual("fhdDk612M4mjT70xkKCZRg==");
	});
});
