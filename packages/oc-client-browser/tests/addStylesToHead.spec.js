/* globals document */
// @ts-check
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : addStylesToHead", () => {
	test("should append a style tag with the correct content in the head", async ({
		page,
	}) => {
		await page.evaluate(() => {
			oc.addStylesToHead("body: {background: red;}");
		});
		const style = await page.evaluate(() => {
			return document.getElementsByTagName("style")[0].textContent;
		});
		expect(style).toEqual("body: {background: red;}");
	});
});
